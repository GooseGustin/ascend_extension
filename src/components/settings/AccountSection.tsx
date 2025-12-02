import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import type { UserSettings } from '../../worker/models/UserSettings';

interface AccountSectionProps {
  settings: UserSettings;
  onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
  isSaving: boolean;
}

export function AccountSection({ settings, onUpdate, isSaving }: AccountSectionProps) {
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [email, setEmail] = useState(settings.email);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    await onUpdate({ displayName, email });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    // TODO: Implement password change API call
    alert('Password change functionality coming soon');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="space-y-6">
      {/* User Profile */}
      <div>
        <h3 className="text-white mb-4 font-semibold">User Profile</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="displayName" className="text-[#b9bbbe]">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={handleSaveProfile}
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde]"
            />
          </div>
          
          <div>
            <Label htmlFor="email" className="text-[#b9bbbe]">Email</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleSaveProfile}
                disabled={settings.emailVerified}
                className="bg-[#202225] border-[#202225] text-[#dcddde]"
              />
              {settings.emailVerified && (
                <span className="text-[#57F287] text-sm whitespace-nowrap">✓ Verified</span>
              )}
            </div>
            {!settings.emailVerified && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]"
              >
                Resend Verification
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-[#202225] mb-4" />
      {/* <hr className="my-2" /> */}

      {/* Password Change */}
      <div>
        <h3 className="text-white mb-4 font-semibold">Change Password</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="oldPassword" className="text-[#b9bbbe]">Old Password</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter old password"
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] placeholder:text-[#72767d]"
            />
          </div>
          
          <div className="mt-4">
            <Label htmlFor="newPassword" className="text-[#b9bbbe]">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] placeholder:text-[#72767d]"
            />
          </div>
          
          <div>
            <Label htmlFor="confirmPassword" className="text-[#b9bbbe]">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="mt-2 bg-[#202225] border-[#202225] text-[#dcddde] placeholder:text-[#72767d]"
            />
          </div>
          
          <Button 
            onClick={handleChangePassword}
            disabled={!oldPassword || !newPassword || !confirmPassword}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
          >
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
}