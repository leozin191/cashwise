import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService, apiMeta } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function SettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const toast = useToast();

    // Profile
    const [name, setName] = useState(user?.name || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    // Delete
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // API test
    const [apiStatus, setApiStatus] = useState(null);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const res = await authService.updateProfile({ name });
            updateUser({ name: res.name });
            toast.success('Profile updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setSavingPassword(true);
        try {
            await authService.changePassword({ currentPassword, newPassword });
            toast.success('Password changed');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await authService.deleteAccount();
            toast.success('Account deleted');
            logout();
        } catch {
            toast.error('Failed to delete account');
        }
    };

    const testApi = async () => {
        setApiStatus('testing');
        try {
            await authService.getProfile();
            setApiStatus('ok');
        } catch {
            setApiStatus('error');
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Profile */}
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">Profile</h3>
                <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Email</label>
                        <input value={user?.email || ''} disabled className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-canvas text-muted" />
                    </div>
                    <button type="submit" disabled={savingProfile} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:bg-primary-dark disabled:opacity-50">
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Current password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">New password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        <p className="text-xs text-muted mt-1">Min 8 chars, uppercase, lowercase, and digit required</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-ink mb-1">Confirm new password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <button type="submit" disabled={savingPassword} className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:bg-primary-dark disabled:opacity-50">
                        {savingPassword ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>

            {/* API Config */}
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-base font-semibold text-ink mb-4">API Configuration</h3>
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-muted">Base URL:</span>
                    <code className="text-sm bg-canvas px-2 py-1 rounded-lg">{apiMeta.baseUrl}</code>
                </div>
                <button onClick={testApi} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border hover:bg-border/20">
                    Test Connection
                </button>
                {apiStatus === 'ok' && <span className="ml-3 text-sm text-success font-medium">Connected</span>}
                {apiStatus === 'error' && <span className="ml-3 text-sm text-error font-medium">Connection failed</span>}
                {apiStatus === 'testing' && <span className="ml-3 text-sm text-muted font-medium">Testing...</span>}
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl p-6 border border-error/20 shadow-sm">
                <h3 className="text-base font-semibold text-error mb-2">Danger Zone</h3>
                <p className="text-sm text-muted mb-4">Permanently delete your account and all data. This cannot be undone.</p>
                <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2 rounded-xl bg-error/10 text-error text-sm font-semibold cursor-pointer border border-error/20 hover:bg-error/20">
                    Delete Account
                </button>
            </div>

            {/* Delete confirmation */}
            <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Account">
                <p className="text-sm text-muted mb-4">This will permanently delete your account and all associated data. Are you absolutely sure?</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 rounded-xl bg-canvas text-ink text-sm font-medium cursor-pointer border border-border">Cancel</button>
                    <button onClick={handleDeleteAccount} className="px-4 py-2 rounded-xl bg-error text-white text-sm font-semibold cursor-pointer border-none">Delete Forever</button>
                </div>
            </Modal>
        </div>
    );
}
