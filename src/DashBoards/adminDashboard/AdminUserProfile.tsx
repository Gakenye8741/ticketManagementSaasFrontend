import React, { useEffect, useState } from 'react';
import { useGetUserByNationalIdQuery, useUpdateUserMutation } from '../../features/APIS/UserApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../../App/store';
import { Moon, Sun, Camera, Shield, User, Mail, Fingerprint, Save, X, Cpu, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';

/**
 * -----------------------------------------------------------------------------------------
 * PREMIUM THEME-AWARE MODAL ENGINE
 * -----------------------------------------------------------------------------------------
 */
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

const AdminUserProfile: React.FC = () => {
  const nationalId = useSelector((state: RootState) => state.auth.user?.nationalId);
  const { data: user, isLoading, refetch } = useGetUserByNationalIdQuery(nationalId!, { skip: !nationalId });
  const [updateUser] = useUpdateUserMutation();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    profileImageUrl: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const CLOUD_NAME = 'dwibg4vvf';
  const UPLOAD_PRESET = 'tickets_Profile';

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
    } catch (error) {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TRIGGER PROTOCOL CONFIRMATION MODAL
    const { isConfirmed } = await StyledModal.fire({
      title: "Authorize_Sync?",
      text: "This action will overwrite your existing biometric registry and profile data.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Execute_Write",
      cancelButtonText: "Abort"
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
        title: 'Registry_Updated',
        timer: 1500,
        showConfirmButton: false,
      });

      setEditMode(false);
      setImageFile(null);
      setUploadProgress(0);
      refetch();
    } catch (err) {
      StyledModal.fire('Error', 'Sync_Fail: Protocol Timeout', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <span className="loading loading-ring loading-lg text-primary"></span>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Scanning_Node...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 md:mt-16 p-2 md:p-6 relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-primary/5 blur-[120px] pointer-events-none"></div>

      <div className="p-[1px] rounded-[2.5rem] bg-gradient-to-br from-primary/40 via-base-content/5 to-secondary/40 shadow-2xl overflow-hidden">
        <div className="bg-base-100/80 backdrop-blur-3xl p-6 md:p-10 rounded-[2.4rem]">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4 border-b border-base-content/5 pb-8">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="hidden sm:block p-3 bg-primary/10 rounded-2xl text-primary"><Cpu size={24}/></div>
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter italic">Identity_<span className="text-primary">Vault</span></h1>
                <p className="text-[9px] font-mono opacity-50 uppercase tracking-[0.3em]">Status: Authorized_Admin</p>
              </div>
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="btn btn-circle btn-ghost border border-base-content/10">
              {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            
            {/* Left: Avatar Column */}
            <div className="md:col-span-4 flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-full blur opacity-25 group-hover:opacity-70 transition duration-1000"></div>
                <img src={previewUrl || '/default-avatar.png'} alt="Profile" className="relative w-40 h-40 md:w-48 md:h-48 rounded-full object-cover border-4 border-base-100 shadow-2xl" />
                
                {editMode && (
                  <label className="absolute bottom-2 right-2 p-4 bg-primary text-white rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                    <Camera size={22}/>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>
              
              {uploadProgress > 0 && (
                <div className="w-full text-center space-y-2">
                  <progress className="progress progress-primary w-full h-1" value={uploadProgress} max="100"></progress>
                  <span className="text-[8px] font-black font-mono">UPLD_STREAM: {uploadProgress}%</span>
                </div>
              )}

              {!editMode && (
                <div className="text-center">
                  <span className="badge badge-primary border-none font-black text-[10px] px-4 py-3 rounded-lg uppercase italic mb-2 tracking-widest">{user.role || 'MEMBER'}</span>
                </div>
              )}
            </div>

            {/* Right: Data Column */}
            <div className="md:col-span-8">
              {editMode ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label text-[9px] font-black uppercase opacity-40 tracking-widest">Entry: First_Name</label>
                      <input name="firstName" value={formData.firstName} onChange={handleChange} className="input input-bordered h-14 bg-base-200/50 rounded-2xl font-bold focus:ring-1 focus:ring-primary" required />
                    </div>
                    <div className="form-control">
                      <label className="label text-[9px] font-black uppercase opacity-40 tracking-widest">Entry: Last_Name</label>
                      <input name="lastName" value={formData.lastName} onChange={handleChange} className="input input-bordered h-14 bg-base-200/50 rounded-2xl font-bold focus:ring-1 focus:ring-primary" required />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8">
                    <button type="button" onClick={() => setEditMode(false)} className="btn btn-ghost h-14 rounded-2xl font-black uppercase italic tracking-widest text-xs flex-1 sm:flex-none" disabled={isSubmitting}>Abort</button>
                    <button type="submit" className="btn btn-primary h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-none" disabled={isSubmitting}>
                      {isSubmitting ? <span className="loading loading-spinner"></span> : <><Save size={16} className="mr-2"/> Save_Changes</>}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-base-200/40 border border-base-content/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Authenticated_As</p>
                      <h2 className="text-2xl font-black italic uppercase tracking-tighter">{user.firstName} {user.lastName}</h2>
                    </div>
                    <div className="hidden sm:block opacity-20"><User size={32}/></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-3xl bg-base-200/20 border border-base-content/5 flex items-center gap-4">
                      <Mail size={18} className="opacity-30"/>
                      <div className="overflow-hidden">
                        <p className="text-[8px] font-black uppercase opacity-40 tracking-widest">Global_Mail</p>
                        <p className="text-xs font-mono truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="p-5 rounded-3xl bg-base-200/20 border border-base-content/5 flex items-center gap-4">
                      <Fingerprint size={18} className="opacity-30"/>
                      <div>
                        <p className="text-[8px] font-black uppercase opacity-40 tracking-widest">Node_Index</p>
                        <p className="text-xs font-mono">{user.nationalId}</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setEditMode(true)} className="btn btn-outline btn-block h-16 rounded-[1.5rem] mt-6 font-black uppercase italic tracking-[0.3em] text-[10px] hover:bg-primary hover:border-primary transition-all">
                    Initiate_Profile_Modify
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 opacity-20 text-[8px] font-mono uppercase tracking-[0.5em]">
            <div className="flex items-center gap-2"><Shield size={12}/> Connection: End_to_End_Encrypted</div>
            <div className="text-center sm:text-right">Core_System_V.2.0.6 // Nyeri_Central_Hub</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserProfile;