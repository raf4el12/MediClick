import { Suspense } from 'react';
import AccountSettings from '@/views/settings/AccountSettings';

export default function SettingsPage() {
    return (
        <Suspense>
            <AccountSettings />
        </Suspense>
    );
}
