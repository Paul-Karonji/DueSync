'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Calendar, Globe, Loader2, PlayCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from '@/lib/hooks/useOnboarding';

interface ProfileSectionProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    timezone: string;
    createdAt: string;
  };
}

// Comprehensive timezones list organized by region
const TIMEZONES = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },

  // Africa
  { value: 'Africa/Cairo', label: 'Cairo (Africa)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (Africa)' },
  { value: 'Africa/Lagos', label: 'Lagos (Africa)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (Africa)' },

  // Americas - North America
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Arizona (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska (US)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (US)' },
  { value: 'America/Toronto', label: 'Toronto (Canada)' },
  { value: 'America/Vancouver', label: 'Vancouver (Canada)' },

  // Americas - Central & South America
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Guatemala', label: 'Guatemala' },
  { value: 'America/Costa_Rica', label: 'Costa Rica' },
  { value: 'America/Panama', label: 'Panama' },
  { value: 'America/Bogota', label: 'Bogota (Colombia)' },
  { value: 'America/Lima', label: 'Lima (Peru)' },
  { value: 'America/Santiago', label: 'Santiago (Chile)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (Argentina)' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo (Brazil)' },
  { value: 'America/Caracas', label: 'Caracas (Venezuela)' },

  // Europe
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Dublin', label: 'Dublin (Ireland)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/Berlin', label: 'Berlin (Germany)' },
  { value: 'Europe/Rome', label: 'Rome (Italy)' },
  { value: 'Europe/Madrid', label: 'Madrid (Spain)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (Netherlands)' },
  { value: 'Europe/Brussels', label: 'Brussels (Belgium)' },
  { value: 'Europe/Zurich', label: 'Zurich (Switzerland)' },
  { value: 'Europe/Vienna', label: 'Vienna (Austria)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (Sweden)' },
  { value: 'Europe/Oslo', label: 'Oslo (Norway)' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (Denmark)' },
  { value: 'Europe/Warsaw', label: 'Warsaw (Poland)' },
  { value: 'Europe/Prague', label: 'Prague (Czech Republic)' },
  { value: 'Europe/Athens', label: 'Athens (Greece)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (Turkey)' },
  { value: 'Europe/Moscow', label: 'Moscow (Russia)' },

  // Asia - Middle East
  { value: 'Asia/Dubai', label: 'Dubai (UAE)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (Saudi Arabia)' },
  { value: 'Asia/Kuwait', label: 'Kuwait' },
  { value: 'Asia/Bahrain', label: 'Bahrain' },
  { value: 'Asia/Qatar', label: 'Qatar' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (Israel)' },
  { value: 'Asia/Beirut', label: 'Beirut (Lebanon)' },
  { value: 'Asia/Baghdad', label: 'Baghdad (Iraq)' },
  { value: 'Asia/Tehran', label: 'Tehran (Iran)' },

  // Asia - South & Southeast Asia
  { value: 'Asia/Karachi', label: 'Karachi (Pakistan)' },
  { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Kolkata (India)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (Bangladesh)' },
  { value: 'Asia/Colombo', label: 'Colombo (Sri Lanka)' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu (Nepal)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (Thailand)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (Malaysia)' },
  { value: 'Asia/Jakarta', label: 'Jakarta (Indonesia)' },
  { value: 'Asia/Manila', label: 'Manila (Philippines)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh (Vietnam)' },
  { value: 'Asia/Yangon', label: 'Yangon (Myanmar)' },

  // Asia - East Asia
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai (China)' },
  { value: 'Asia/Taipei', label: 'Taipei (Taiwan)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
  { value: 'Asia/Seoul', label: 'Seoul (South Korea)' },

  // Oceania
  { value: 'Australia/Perth', label: 'Perth (Australia)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (Australia)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (Australia)' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne (Australia)' },
  { value: 'Pacific/Auckland', label: 'Auckland (New Zealand)' },
  { value: 'Pacific/Fiji', label: 'Fiji' },
  { value: 'Pacific/Guam', label: 'Guam' },
];

export function ProfileSection({ user }: ProfileSectionProps) {
  const [name, setName] = useState(user.name || '');
  const [timezone, setTimezone] = useState(user.timezone);
  const queryClient = useQueryClient();
  const { resetOnboarding, isResettingOnboarding } = useOnboarding();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; timezone: string }) => {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    updateProfileMutation.mutate({ name: name.trim(), timezone });
  };

  const hasChanges = name !== (user.name || '') || timezone !== user.timezone;

  // Get user initials for avatar fallback
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your personal information and timezone preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image || undefined} alt={name || 'User'} />
            <AvatarFallback className="text-lg font-semibold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Profile Picture</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Managed by your Google account
            </p>
          </div>
        </div>

        <Separator />

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Display Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="max-w-md"
          />
          <p className="text-xs text-gray-500 dark:text-slate-400">
            This is your public display name in the application
          </p>
        </div>

        {/* Email Address */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <div className="flex items-center gap-2">
            <Input
              value={user.email}
              disabled
              className="max-w-md bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Email is managed by your Google account and cannot be changed
          </p>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Timezone
          </Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Your timezone is used for scheduling notifications and displaying due dates
          </p>
        </div>

        {/* Member Since */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Member Since
          </Label>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            {new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <Separator />

        {/* Resume Welcome Tour */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            Welcome Tour
          </Label>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            Want to see the welcome tour again? Restart it to learn about DueSync's features.
          </p>
          <Button
            variant="outline"
            onClick={resetOnboarding}
            disabled={isResettingOnboarding}
            className="w-full sm:w-auto"
          >
            {isResettingOnboarding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Resume Welcome Tour
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* App Version */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            App Version
          </Label>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              v1.1.0
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Security Patched (CVE-2025-55182/CVE-2025-66478)
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            DueSync is running the latest version with security updates
          </p>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setName(user.name || '');
              setTimezone(user.timezone);
            }}
            disabled={!hasChanges || updateProfileMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
