export interface UserSettings {
  userId: string;
  
  // Account
  displayName: string;
  email: string;
  emailVerified: boolean;
  
  // Notifications
  notifications: {
    dailySummary: boolean;
    dailySummaryTime: string; // HH:MM format
    taskReminders: boolean;
    questReminders: boolean;
    aiNudges: boolean;
  };
  
  // Appearance
  appearance: {
    theme: 'light' | 'dark' | 'system';
    accentColor: 'blue' | 'emerald' | 'purple' | 'gold';
  };
  
  // Productivity
  productivity: {
    pomodoro: {
      focusDuration: number; // minutes
      breakDuration: number; // minutes
      autoStartBreak: boolean; // NEW
      autoStartNext: boolean;
    },
    deepFocus: { 
      maxDurationMin: number; // Default: 120
      xpRateMultiplier: number; // Default: 0.5 (50% of pomodoro rate)
      rpRateMultiplier: number; // Default: 0.7 (70% of pomodoro rate)
    },
    tasks: {
      defaultPriority: 'A' | 'B' | 'C';
    },
    quests: {
      defaultType: 'Quest' | 'TodoQuest';
      defaultFrequency: 'Daily' | 'Weekly' | 'Custom';
    };
  };
  
  // AI Settings
  ai: {
    tone: 'mild' | 'standard' | 'tough';
    nudgeFrequency: 'low' | 'medium' | 'high';
    suggestions: {
      dailyPlan: boolean;
      questImprovements: boolean;
      reschedules: boolean;
      weeklyAnalysis: boolean;
    };
  };

  // GM Validation Quota
  gmValidationQuota: {
    dailyLimit: number;              // Default: 10 successful AI validations per day
    successfulValidationsToday: number;  // Count of AI validations that succeeded
    resetTimestamp: string;           // ISO8601 - when quota resets (midnight UTC)
  };

  // Data & Storage
  storage: {
    cloudSync: boolean;
  };
  
  // Extension
  extension: {
    autoOpenNewTab: boolean;
    keyboardShortcuts: boolean;
  };
  
  // Metadata
  lastModified: string; // ISO8601
  version: number; // Schema version
}

// Default settings
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId'> = {
  displayName: 'Warrior',
  email: '',
  emailVerified: false,
  notifications: {
    dailySummary: true,
    dailySummaryTime: '09:00',
    taskReminders: true,
    questReminders: true,
    aiNudges: true,
  },
  appearance: {
    theme: 'dark',
    accentColor: 'blue',
  },
  productivity: {
    pomodoro: {
      focusDuration: 25,
      breakDuration: 5,
      autoStartBreak: true, // auto-transition to break
      autoStartNext: false,
    },
    deepFocus: { 
      maxDurationMin: 120,
      xpRateMultiplier: 0.5,
      rpRateMultiplier: 0.7,
    },
    tasks: {
      defaultPriority: 'B',
    },
    quests: {
      defaultType: 'Quest',
      defaultFrequency: 'Daily',
    },
  },
  ai: {
    tone: 'standard',
    nudgeFrequency: 'medium',
    suggestions: {
      dailyPlan: true,
      questImprovements: true,
      reschedules: true,
      weeklyAnalysis: false,
    },
  },
  gmValidationQuota: {
    dailyLimit: 10,
    successfulValidationsToday: 0,
    resetTimestamp: new Date().toISOString(),
  },
  storage: {
    cloudSync: false,
  },
  extension: {
    autoOpenNewTab: true,
    keyboardShortcuts: true,
  },
  lastModified: new Date().toISOString(),
  version: 1,
};