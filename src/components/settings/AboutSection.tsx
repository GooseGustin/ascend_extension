import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { ExternalLink } from 'lucide-react';

export function AboutSection() {
  const APP_VERSION = '1.0.0-beta';
  const LAST_UPDATED = '2025-11-30';

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-[#b9bbbe]">Version</Label>
        <p className="text-[#dcddde] mt-1 font-mono">{APP_VERSION}</p>
        <p className="text-sm text-[#72767d] mt-1">
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleOpenLink('https://github.com/yourusername/ascend/releases')}
            variant="outline"
            className="text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]"
          >
            Release Notes <ExternalLink className="ml-2 w-4 h-4" />
          </Button>
          <Button
            onClick={() => handleOpenLink('https://docs.ascend.app')}
            variant="outline"
            className="text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]"
          >
            Documentation <ExternalLink className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>

      <Separator className="bg-[#202225]" />

      <div>
        <Button
          onClick={() => handleOpenLink('mailto:support@ascend.app')}
          variant="outline"
          className="text-[#dcddde] border-[#4f545c] hover:bg-[#4f545c]"
        >
          Contact Support
        </Button>
        <p className="text-sm text-[#72767d] mt-2">Get help with Ascend</p>
      </div>

      <Separator className="bg-[#202225]" />

      <div className="space-y-2">
        <button
          onClick={() => handleOpenLink('https://ascend.app/privacy')}
          className="text-[#5865F2] hover:underline block text-sm"
        >
          Privacy Policy <ExternalLink className="inline w-3 h-3 ml-1" />
        </button>
        <button
          onClick={() => handleOpenLink('https://ascend.app/terms')}
          className="text-[#5865F2] hover:underline block text-sm"
        >
          Terms of Service <ExternalLink className="inline w-3 h-3 ml-1" />
        </button>
        <button
          onClick={() => handleOpenLink('https://ascend.app/licenses')}
          className="text-[#5865F2] hover:underline block text-sm"
        >
          Open Source Licenses <ExternalLink className="inline w-3 h-3 ml-1" />
        </button>
      </div>

      <Separator className="bg-[#202225]" />

      <div className="text-center py-4">
        <p className="text-[#72767d] text-sm">
          Made with ❤️ by the Ascend Team
        </p>
        <p className="text-[#72767d] text-xs mt-2">
          © 2025 Ascend. All rights reserved.
        </p>
      </div>
    </div>
  );
}