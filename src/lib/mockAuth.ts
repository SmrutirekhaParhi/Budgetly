// Mock Authentication System for Development
// Stores users in localStorage - NOT for production!

interface MockUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  pin: string;
  pinVerified: boolean;
  createdAt: string;
}

interface MockSession {
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string;
    };
  };
}

const MOCK_USERS_KEY = "budgetly_mock_users";
const MOCK_CURRENT_USER_KEY = "budgetly_current_user";

export const mockAuth = {
  // Get all users from localStorage
  getAllUsers: (): MockUser[] => {
    const users = localStorage.getItem(MOCK_USERS_KEY);
    return users ? JSON.parse(users) : [];
  },

  // Save users to localStorage
  saveUsers: (users: MockUser[]) => {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  },

  // Sign up a new user
  signUp: async (email: string, password: string, fullName: string) => {
    const users = mockAuth.getAllUsers();
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
      return {
        error: new Error("User already exists"),
        user: null
      };
    }

    const newUser: MockUser = {
      id: `user_${Date.now()}`,
      email,
      password,
      fullName,
      pin: "",
      pinVerified: false,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    mockAuth.saveUsers(users);

    // Set as current session
    localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify({
      user: {
        id: newUser.id,
        email: newUser.email,
        user_metadata: { full_name: newUser.fullName }
      }
    }));

    return { error: null, user: newUser };
  },

  // Sign in
  signIn: async (email: string, password: string) => {
    const users = mockAuth.getAllUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return { error: new Error("Invalid credentials"), user: null };
    }

    // Set as current session
    localStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.fullName }
      }
    }));

    return { error: null, user };
  },

  // Get current user
  getCurrentUser: async () => {
    const session = localStorage.getItem(MOCK_CURRENT_USER_KEY);
    if (!session) return null;
    
    const parsed = JSON.parse(session);
    const users = mockAuth.getAllUsers();
    const user = users.find(u => u.id === parsed.user.id);
    
    return user || null;
  },

  // Get current session
  getSession: async () => {
    const session = localStorage.getItem(MOCK_CURRENT_USER_KEY);
    return session ? JSON.parse(session) : null;
  },

  // Sign out
  signOut: async () => {
    localStorage.removeItem(MOCK_CURRENT_USER_KEY);
  },

  // Set PIN
  setPin: async (userId: string, pin: string) => {
    const users = mockAuth.getAllUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (!/^\d{6}$/.test(pin)) {
      return { success: false, message: "PIN must be 6 digits" };
    }

    user.pin = pin;
    user.pinVerified = true;
    mockAuth.saveUsers(users);

    return { success: true, message: "PIN set successfully" };
  },

  // Verify PIN
  verifyPin: async (userId: string, pinInput: string) => {
    const users = mockAuth.getAllUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (!user.pin) {
      return { success: false, message: "PIN not configured" };
    }

    if (user.pin !== pinInput) {
      return { success: false, message: "Invalid PIN" };
    }

    return { success: true, message: "PIN verified" };
  }
};
