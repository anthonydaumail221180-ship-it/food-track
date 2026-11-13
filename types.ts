
export interface MenuItem {
  name: string;
  description: string;
  price: string;
}

export interface FoodTruck {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  locationName: string; // e.g. "Place d'Armes"
  coordinates?: {
    lat: number;
    lng: number;
  };
  rating: number; // 0-5
  imageUrl?: string;
  isOpen: boolean;
  // Detailed profile info
  phone?: string;
  website?: string;
  email?: string;
  hours?: string;
  menu?: MenuItem[];
}

export interface SocialPost {
  id: string;
  author: string;
  isInfluencer: boolean;
  content: string; // Text or description of video
  imageUrl?: string; // Placeholder for uploaded photo
  videoUrl?: string; // URL to the external video
  platform?: 'tiktok' | 'instagram';
  views?: number;
  likes: number;
  timestamp: string;
  authorAvatar?: string;
}

export interface VoteCandidate {
  truckId: string;
  name: string;
  votes: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'offer' | 'alert' | 'info' | 'quiz';
  read: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  fact: string; // Fun fact explanation
}

export interface CheckIn {
  id: string;
  truckId: string;
  truckName: string;
  itemName: string;
  date: string; // ISO string
  taggedFriend?: {
    name: string;
    phone?: string;
    status: 'app_user' | 'unknown';
  };
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // Full string including prefix
  password?: string; // New field for auth
  nickname: string;
  avatarId: string; // ID of the food avatar
  permissions: {
    notifications: boolean;
    location: boolean;
  };
  language?: string; // Choix de la langue
  isAdmin?: boolean; // New admin flag
  history: CheckIn[]; // Historique des repas
}

// New Interface for Admin Agent Updates
export interface AgentUpdate {
  id: string;
  truckName: string;
  type: 'menu' | 'photo' | 'location' | 'alert';
  oldValue?: string;
  newValue: string;
  source: 'sms' | 'instagram' | 'email';
  timestamp: string;
  confidence: number; // 0-100%
  status: 'pending' | 'approved' | 'rejected';
}

// New Interface for the Radar/Scout Agent
export interface TrendItem {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'buzz' | 'hidden_gem';
  source: 'instagram' | 'facebook' | 'tiktok' | 'web';
  link?: string;
  date?: string; // For events
  location?: string;
  imageUrl?: string;
}

export enum AppView {
  ONBOARDING = 'ONBOARDING',
  LANDING = 'LANDING',
  HOME = 'HOME',
  RADAR = 'RADAR', // New View
  MAP_TRANSPORT = 'MAP_TRANSPORT',
  SOCIAL = 'SOCIAL',
  VOTE = 'VOTE',
  PROFILE = 'PROFILE', // Public truck profile
  USER_PROFILE = 'USER_PROFILE', // My Account
  FAVORITES = 'FAVORITES',
  NOTIFICATIONS = 'NOTIFICATIONS',
  QUIZ = 'QUIZ',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD' 
}
