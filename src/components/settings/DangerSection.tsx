import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import type { UserSettings } from '../../worker/models/UserSettings';
import { getSettingsService } from '../../worker';

interface DangerSectionProps {
  settings: UserSettings;
}

export function DangerSection({ settings }: DangerSectionProps) {
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const settingsService = getSettingsService();

  const handleResetProgress = async () => {
    try {
      await settingsService.resetAllProgress(settings.userId);
      alert('All progress has been reset. Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset progress');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    try {
      // TODO: Implement account deletion API
      alert('Account deletion functionality coming soon');
      setDeleteConfirmation('');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete account');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg">
        <h3 className="text-red-500 mb-4 font-semibold">⚠️ Danger Zone</h3>
        <p className="text-sm text-[#b9bbbe] mb-4">
          These actions are irreversible. Proceed with extreme caution.
        </p>

        <div className="space-y-4">
          {/* Reset All Progress */}
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Reset All Progress
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#2f3136] border-[#202225]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-500">
                    ⚠️ Reset All Progress?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[#b9bbbe]">
                    This will permanently delete:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All quests and tasks</li>
                      <li>All XP and levels</li>
                      <li>All session history</li>
                      <li>All progress statistics</li>
                      <li>All streaks and achievements</li>
                    </ul>
                    <p className="mt-3 font-semibold">
                      This action cannot be undone. Are you absolutely sure?
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#4f545c] text-[#dcddde] border-0 hover:bg-[#5d6269]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetProgress}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-sm text-[#72767d] mt-2">
              Delete all quests, tasks, and statistics
            </p>
          </div>

          <Separator className="bg-red-900/30" />

          {/* Delete Account */}
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="bg-red-700 hover:bg-red-800 text-white"
                >
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#2f3136] border-[#202225]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-500">
                    ⚠️ Delete Account?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[#b9bbbe]">
                    This will permanently delete your account and all associated data
                    including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Your user profile</li>
                      <li>All quests, tasks, and progress</li>
                      <li>All settings and preferences</li>
                      <li>All cloud-synced data</li>
                    </ul>
                    <p className="mt-3 font-semibold">
                      This action cannot be undone. Type "DELETE" to confirm.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="bg-[#202225] border-[#202225] text-[#dcddde] placeholder:text-[#72767d]"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel
                    onClick={() => setDeleteConfirmation('')}
                    className="bg-[#4f545c] text-[#dcddde] border-0 hover:bg-[#5d6269]"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmation !== 'DELETE'}
                    className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-sm text-[#72767d] mt-2">
              Permanently delete your Ascend account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}