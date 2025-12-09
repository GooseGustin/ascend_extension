/**
 * AuthService
 * Manages current user session
 * Returns userId for components to use
 */
import { getDB } from '../db/indexed-db';
import { SeedService } from './seed.service';
export class AuthService {
    constructor() {
        this.db = getDB();
        this.seedService = new SeedService();
        this.currentUserId = null;
    }
    /**
     * Initialize and get current user ID
     * Seeds database on first load
     */
    async getCurrentUserId() {
        // Check if already initialized
        if (this.currentUserId) {
            // console.log("In auth service, user is current user");
            return this.currentUserId;
        }
        // Check localStorage for saved user
        const savedUserId = localStorage.getItem('ascend_current_user');
        if (savedUserId) {
            // Verify user exists in DB
            const user = await this.db.users.get(savedUserId);
            // console.log("In auth service, user gotten from db");
            if (user) {
                this.currentUserId = savedUserId;
                return savedUserId;
            }
        }
        // No saved user, seed database and get test user
        const userId = await this.seedService.seedDatabase();
        this.currentUserId = userId;
        localStorage.setItem('ascend_current_user', userId);
        return userId;
    }
    /**
     * Get current user profile
     */
    async getCurrentUser() {
        const userId = await this.getCurrentUserId();
        return await this.db.users.get(userId);
    }
    /**
     * Switch user (for future multi-user support)
     */
    async switchUser(userId) {
        const user = await this.db.users.get(userId);
        if (!user) {
            throw new Error('User not found');
        }
        this.currentUserId = userId;
        localStorage.setItem('ascend_current_user', userId);
    }
    /**
     * Logout (clear current user)
     */
    logout() {
        this.currentUserId = null;
        localStorage.removeItem('ascend_current_user');
    }
}
