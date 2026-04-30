-- Add savings_target column to budgets and update on_expense_change trigger
BEGIN;

-- Add column to budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS savings_target NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Replace the trigger function to also check savings target
CREATE OR REPLACE FUNCTION public.on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
  current_month INTEGER;
  current_year INTEGER;
  total_spent NUMERIC(12,2);
  budget_amount NUMERIC(12,2);
  usage_pct NUMERIC;
  savings_target NUMERIC(12,2);
  saved_amount NUMERIC(12,2);
  existing_count INTEGER;
  sub_rec RECORD;
  new_next_date DATE;
BEGIN
  current_month := EXTRACT(MONTH FROM NEW.expense_date);
  current_year := EXTRACT(YEAR FROM NEW.expense_date);
  
  SELECT COALESCE(SUM(amount), 0) INTO total_spent
  FROM public.expenses
  WHERE user_id = NEW.user_id
    AND EXTRACT(MONTH FROM expense_date) = current_month
    AND EXTRACT(YEAR FROM expense_date) = current_year;
  
  SELECT b.amount, COALESCE(b.savings_target, 0) INTO budget_amount, savings_target
  FROM public.budgets b
  WHERE b.user_id = NEW.user_id
    AND b.month = current_month
    AND b.year = current_year;
  
  IF budget_amount IS NOT NULL AND budget_amount > 0 THEN
    usage_pct := (total_spent / budget_amount) * 100;

    -- Only alert when 80% of budget is crossed (deduplicated per month)
    IF usage_pct >= 80 THEN
      SELECT COUNT(*) INTO existing_count FROM public.notifications
      WHERE user_id = NEW.user_id
        AND title = 'Budget Warning'
        AND EXTRACT(MONTH FROM created_at) = current_month
        AND EXTRACT(YEAR FROM created_at) = current_year;

      IF existing_count = 0 THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (NEW.user_id, 'Budget Warning', 'You have used ' || ROUND(usage_pct, 2)::text || '% of your budget.', 'warning');
      END IF;
    END IF;

    -- Check savings target (only if savings_target is configured)
    saved_amount := budget_amount - total_spent;
    IF savings_target > 0 THEN
      IF saved_amount >= savings_target THEN
        -- avoid duplicate 'Savings Achieved' notifications in same month
        SELECT COUNT(*) INTO existing_count FROM public.notifications
        WHERE user_id = NEW.user_id
          AND title = 'Savings Achieved'
          AND EXTRACT(MONTH FROM created_at) = current_month
          AND EXTRACT(YEAR FROM created_at) = current_year;

        IF existing_count = 0 THEN
          INSERT INTO public.notifications (user_id, title, message, type)
          VALUES (
            NEW.user_id,
            'Savings Achieved',
            'Congratulations! You saved ' || ROUND(saved_amount, 2)::text || ' which is ' || ROUND((saved_amount / budget_amount) * 100, 2)::text || '% of your monthly budget.',
            'primary'
          );
        END IF;
      ELSIF saved_amount < savings_target THEN
        -- If savings drop below target, notify once per month
        SELECT COUNT(*) INTO existing_count FROM public.notifications
        WHERE user_id = NEW.user_id
          AND title = 'Savings Target Breached'
          AND EXTRACT(MONTH FROM created_at) = current_month
          AND EXTRACT(YEAR FROM created_at) = current_year;

        IF existing_count = 0 THEN
          INSERT INTO public.notifications (user_id, title, message, type)
          VALUES (
            NEW.user_id,
            'Savings Target Breached',
            'Your savings have dropped below your target of ' || ROUND(savings_target,2)::text || '. Current saved: ' || ROUND(saved_amount,2)::text || '.',
            'danger'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- Match due subscriptions: if a due subscription's amount/name matches this expense, advance its next_due_date
  FOR sub_rec IN
    SELECT id, name, amount, billing_cycle, next_due_date
    FROM public.subscriptions
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND next_due_date <= NEW.expense_date
  LOOP
    IF NEW.type = 'EXPENSE' THEN
      IF (NEW.amount IS NOT NULL AND sub_rec.amount IS NOT NULL AND abs(NEW.amount - sub_rec.amount) < 0.01)
         OR (NEW.description IS NOT NULL AND LOWER(NEW.description) LIKE '%' || LOWER(sub_rec.name) || '%') THEN
        -- compute next due date based on billing_cycle
        IF sub_rec.billing_cycle = 'monthly' THEN
          new_next_date := (sub_rec.next_due_date + INTERVAL '1 month')::date;
        ELSIF sub_rec.billing_cycle = 'weekly' THEN
          new_next_date := (sub_rec.next_due_date + INTERVAL '7 days')::date;
        ELSIF sub_rec.billing_cycle = 'yearly' THEN
          new_next_date := (sub_rec.next_due_date + INTERVAL '1 year')::date;
        ELSE
          new_next_date := (sub_rec.next_due_date + INTERVAL '1 month')::date;
        END IF;

        UPDATE public.subscriptions SET next_due_date = new_next_date WHERE id = sub_rec.id;

        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
          NEW.user_id,
          'Subscription Paid',
          'Marked "' || sub_rec.name || '" as paid. Next due: ' || TO_CHAR(new_next_date, 'Mon dd, YYYY'),
          'primary'
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
