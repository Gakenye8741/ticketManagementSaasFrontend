import React, { useEffect, useState } from 'react';
import { useGetUserByNationalIdQuery, useUpdateUserMutation } from '../../features/APIS/UserApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../../App/store';
import { Moon, Sun, Camera, Shield, User, Mail, Fingerprint, Save, Sparkles } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const CLOUD_NAME = 'dwibg4vvf';
const UPLOAD_PRESET = 'tickets_Profile';

const StyledModal = Swal.mixin({
  customClass: {
    popup: "rounded-[2rem] bg-base-100 border border-base-300 shadow-2xl backdrop-blur-xl max-w-[90%]",
    title: "text-xl font-black text-base-content uppercase tracking-tighter italic pb-4 border-b border-base-300/50 w-full",
    htmlContainer: "text-base-content/70 font-medium py-4",
    confirmButton: "btn btn-primary px-8 mx-2 rounded-xl font-black italic tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all",
    cancelButton: "btn btn-ghost px-8 mx-2 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all",
  },
  buttonsStyling: false,
  background: "var(--b1)", 
  color: "var(--bc)",    
  showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
  hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
});

interface ViewModeProps {
  user: any;
  onEditClick: () => void;
}

const ViewMode: React.FC<ViewModeProps> = ({ user, onEditClick }) => (
  <motion.div 
    key="view"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="space-y-6"
  >
    <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-r from-primary/10 via-base-200/50 to-secondary/10 border border-base-content/10 shadow-sm flex items-center justify-between">
      <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
        <User size={180}/>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse"></span>
          <p className="text-[9px] font-black uppercase opacity-50 tracking-[0.25em]">Ticket Stream Verified Account</p>
        </div>
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-base-content">{user.firstName} {user.lastName}</h2>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="p-5 rounded-[1.75rem] bg-base-200/40 border border-base-content/5 flex items-center gap-4 hover:border-primary/30 transition-all duration-300">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
          <Mail size={20}/>
        </div>
        <div className="overflow-hidden">
          <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Email Address</p>
          <p className="text-xs font-mono font-bold text-base-content truncate mt-0.5">{user.email}</p>
        </div>
      </div>

      <div className="p-5 rounded-[1.75rem] bg-base-200/40 border border-base-content/5 flex items-center gap-4 hover:border-primary/30 transition-all duration-300">
        <div className="p-3 bg-secondary/10 rounded-2xl text-secondary shrink-0">
          <Fingerprint size={20}/>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase opacity-40 tracking-widest">Digital ID / National ID</p>
          <p className="text-xs font-mono font-bold text-base-content mt-0.5">{user.nationalId}</p>
        </div>
      </div>
    </div>

    <button onClick={onEditClick} className="btn btn-primary btn-block h-16 rounded-[1.5rem] mt-6 font-black uppercase italic tracking-[0.3em] text-[10px] shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all">
      <Sparkles size={16} className="mr-1" /> Edit Profile Details
    </button>
  </motion.div>
);

interface EditModeProps {
  formData: { firstName: string; lastName: string; profileImageUrl: string };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const EditMode: React.FC<EditModeProps> = ({ formData, handleChange, handleSubmit, onCancel, isSubmitting }) => (
  <motion.form 
    key="edit"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    onSubmit={handleSubmit} 
    className="space-y-6"
  >
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="form-control">
        <label className="label text-[9px] font-black uppercase opacity-50 tracking-widest">First Name</label>
        <input name="firstName" value={formData.firstName} onChange={handleChange} className="input input-bordered h-14 bg-base-200/50 rounded-2xl font-bold focus:ring-2 focus:ring-primary border-base-content/10 transition-all" required />
      </div>
      <div className="form-control">
        <label className="label text-[9px] font-black uppercase opacity-50 tracking-widest">Last Name</label>
        <input name="lastName" value={formData.lastName} onChange={handleChange} className="input input-bordered h-14 bg-base-200/50 rounded-2xl font-bold focus:ring-2 focus:ring-primary border-base-content/10 transition-all" required />
      </div>
    </div>

    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
      <button type="button" onClick={onCancel} className="btn btn-ghost h-14 rounded-2xl font-black uppercase italic tracking-widest text-xs flex-1 sm:flex-none" disabled={isSubmitting}>Cancel</button>
      <button type="submit" className="btn btn-primary h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-none" disabled={isSubmitting}>
        {isSubmitting ? <span className="loading loading-spinner"></span> : <><Save size={16} className="mr-2"/> Save Changes</>}
      </button>
    </div>
  </motion.form>
);

const UserProfile: React.FC = () => {
  const nationalId = useSelector((state: RootState) => state.auth.user?.nationalId);
  const { data: user, isLoading, refetch } = useGetUserByNationalIdQuery(nationalId!, { skip: !nationalId });
  const [updateUser] = useUpdateUserMutation();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', profileImageUrl: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        profileImageUrl: user.profileImageUrl || '',
      });
      setPreviewUrl(user.profileImageUrl || '');
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.profileImageUrl;
    const cloudFormData = new FormData();
    cloudFormData.append('file', imageFile);
    cloudFormData.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        cloudFormData,
        {
          onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1))),
        }
      );
      return response.data.secure_url;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isConfirmed } = await StyledModal.fire({
      title: "Save Changes?",
      text: "Are you sure you want to update your profile information?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel"
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    const uploadedUrl = await uploadImage();

    try {
      await updateUser({
        nationalId: nationalId!,
        ...formData,
        profileImageUrl: uploadedUrl || formData.profileImageUrl,
      }).unwrap();

      StyledModal.fire({
        icon: 'success',
        title: 'Profile Updated',
        timer: 1500,
        showConfirmButton: false,
      });

      setEditMode(false);
      setImageFile(null);
      setUploadProgress(0);
      refetch();
    } catch {
      StyledModal.fire('Error', 'There was a problem updating your profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <span className="loading loading-ring loading-lg text-primary"></span>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full min-h-screen bg-base-100 p-4 md:p-12 relative"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-72 bg-primary/10 blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-6 border-b border-base-content/5 pb-8">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner shadow-primary/20"><Sparkles size={28}/></div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">TicketStream <span className="text-primary">Profile</span></h1>
              <p className="text-[9px] font-mono opacity-50 uppercase tracking-[0.3em]">Manage Your Account Details</p>
            </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="btn btn-circle btn-ghost border border-base-content/10 hover:bg-base-200 transition-all shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Avatar Column */}
          <div className="lg:col-span-4 flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary via-secondary to-blue-600 rounded-full blur-md opacity-30 group-hover:opacity-75 transition duration-500"></div>
              <img 
                src={previewUrl || '/default-avatar.png'} 
                alt="Profile Avatar" 
                className="relative w-44 h-44 md:w-52 md:h-52 rounded-full object-cover border-4 border-base-100 shadow-2xl" 
              />
              
              {editMode && (
                <label className="absolute bottom-2 right-2 p-4 bg-primary text-primary-content rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl border-2 border-base-100">
                  <Camera size={22}/>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
            
            {uploadProgress > 0 && (
              <div className="w-full text-center space-y-2">
                <progress className="progress progress-primary w-full h-1.5" value={uploadProgress} max="100"></progress>
                <span className="text-[9px] font-black font-mono">Upload Progress: {uploadProgress}%</span>
              </div>
            )}

            {!editMode && (
              <div className="text-center">
                <span className="badge badge-primary border-none font-black text-[10px] px-5 py-3.5 rounded-xl uppercase italic tracking-widest shadow-md shadow-primary/20">
                  {user.role || 'VIP MEMBER'}
                </span>
              </div>
            )}
          </div>

          {/* Details/Form Column */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {editMode ? (
                <EditMode 
                  formData={formData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  onCancel={() => setEditMode(false)}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <ViewMode 
                  user={user}
                  onEditClick={() => setEditMode(true)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer badge */}
        <div className="mt-16 pt-6 border-t border-base-content/5 flex flex-col sm:flex-row justify-between items-center gap-4 opacity-30 text-[8px] font-mono uppercase tracking-[0.5em]">
          <div className="flex items-center gap-2"><Shield size={12}/> TicketStream Secure Connection</div>
          <div className="text-center sm:text-right">Encrypted Profile Module</div>
        </div>

      </div>
    </motion.div>
  );
};

export default UserProfile;