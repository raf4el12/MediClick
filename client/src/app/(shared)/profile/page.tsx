import { redirect } from 'next/navigation';

// La cuenta de todos los actores vive en /settings/account (UI-31).
export default function ProfilePage() {
  redirect('/settings/account?tab=cuenta');
}
