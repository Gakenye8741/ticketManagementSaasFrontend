import React, { useState, useMemo } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Pencil, Trash2, Plus, Film, Image as ImageIcon, Search, X, Filter, Play, Maximize2 } from 'lucide-react';
import {
  useGetAllMediaPaginatedQuery,
  useCreateMediaMutation,
  useDeleteMediaMutation,
} from '../../features/APIS/mediaApi';
import { eventApi } from '../../features/APIS/EventsApi';
import { useSelector } from 'react-redux';
import { PuffLoader } from 'react-spinners';
import type { RootState } from '../../App/store';

const MySwal = withReactContent(Swal);

interface Event {
  eventId: number;
  title: string;
}

interface Media {
  mediaId: number;
  eventId: number;
  type: 'image' | 'video';
  url: string;
  uploadedAt: string;
  altText?: string;
}

const AllMedia: React.FC = () => {
  const { data: mediaList, isLoading, isError } = useGetAllMediaPaginatedQuery(undefined, {
    pollingInterval: 30000,
  });
  const { data: events = [] } = eventApi.useGetAllEventsQuery({});
  const [createMedia, { isLoading: isCreating }] = useCreateMediaMutation();
  const [deleteMedia] = useDeleteMediaMutation();

  const cloud_name = 'dwibg4vvf';
  const preset_key = 'tickets';

  // State for Upload
  const [eventId, setEventId] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for Media Preview Modal (both image and video)
  const [activeMedia, setActiveMedia] = useState<Media | null>(null);
  
  // State for Filtering
  const [filterType, setFilterType] = useState<string>('all');
  const [searchEvent, setSearchEvent] = useState<string>('');
  
  const firstName = useSelector((state: RootState) => state.auth.user?.firstName);

  const getEventName = (id: number): string => {
    const match = events.find((event: Event) => event.eventId === id);
    return match?.title || `Event ${id}`;
  };

  const filteredMedia = useMemo(() => {
    if (!mediaList) return [];
    return mediaList.filter((media: Media) => {
      const eventName = getEventName(media.eventId).toLowerCase();
      const matchesType = filterType === 'all' || media.type === filterType;
      const matchesEvent = eventName.includes(searchEvent.toLowerCase());
      return matchesType && matchesEvent;
    });
  }, [mediaList, filterType, searchEvent, events]);

  const glassModalConfig = {
    background: "rgba(15, 23, 42, 0.8)",
    color: "#fff",
    customClass: {
      popup: "rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl w-[90%] max-w-md",
      confirmButton: "!rounded-xl !bg-primary !px-8 !py-3 !text-xs !font-black !uppercase",
    }
  };

  const handleCreateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !eventId || !type) {
      MySwal.fire({ ...glassModalConfig, title: 'MISSING INFO', text: 'Please fill all fields.', icon: 'warning' });
      return;
    }
    const cloudFormData = new FormData();
    cloudFormData.append('file', file);
    cloudFormData.append('upload_preset', preset_key);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloud_name}/${type}/upload`,
        cloudFormData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(percent);
          },
        }
      );
      const url = response.data.secure_url;
      await createMedia({ eventId: Number(eventId), type, url }).unwrap();
      setEventId('');
      setFile(null);
      setUploadProgress(0);
      setIsModalOpen(false);
      MySwal.fire({ ...glassModalConfig, title: 'SUCCESS', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err) {
      MySwal.fire({ ...glassModalConfig, title: 'ERROR', text: 'Upload failed.', icon: 'error' });
    }
  };

  const handleDelete = async (mediaId: number) => {
    const confirm = await MySwal.fire({
      ...glassModalConfig,
      title: 'DELETE MEDIA?',
      text: 'This is permanent!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'YES, DELETE',
    });
    if (confirm.isConfirmed) {
      try {
        await deleteMedia(mediaId).unwrap();
        MySwal.fire({ ...glassModalConfig, title: 'DELETED', icon: 'success', timer: 1500, showConfirmButton: false });
      } catch (err) {
        MySwal.fire({ ...glassModalConfig, title: 'ERROR', icon: 'error' });
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100">
        <PuffLoader color="hsl(var(--p))" size={60} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 pb-32 font-sans md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-base-200/50 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-base-content/5 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter">
              👋 HEY <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Gallery & Media Manager</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-sm rounded-xl px-6 font-black uppercase italic w-full md:w-auto"
          >
            <Plus size={16} className="mr-2" /> Add Media
          </button>
        </div>

        {/* Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-base-200/30 p-4 rounded-[2rem]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <input
              type="text"
              placeholder="FILTER BY EVENT NAME..."
              className="w-full pl-12 pr-4 py-4 bg-base-100/50 rounded-2xl border border-base-content/5 text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-primary/30"
              value={searchEvent}
              onChange={(e) => setSearchEvent(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
            <select
              className="w-full pl-12 pr-4 py-4 bg-base-100/50 rounded-2xl border border-base-content/5 text-[10px] font-bold uppercase outline-none appearance-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">ALL TYPES</option>
              <option value="image">IMAGES ONLY</option>
              <option value="video">VIDEOS ONLY</option>
            </select>
          </div>
        </div>

        {/* Media Grid */}
        {isError ? (
          <div className="py-20 text-center text-error font-black uppercase tracking-widest italic">❌ Failed to load media</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((media: Media) => (
              <div
                key={media.mediaId}
                className="group bg-base-200/40 backdrop-blur-md border border-base-content/5 rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div 
                  className="relative h-56 overflow-hidden cursor-pointer"
                  onClick={() => setActiveMedia(media)}
                >
                  {media.type === 'image' ? (
                    <>
                      <img
                        src={media.url}
                        alt={media.altText || 'Media'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                         <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                           <Maximize2 className="text-white" size={20} />
                         </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <video className="w-full h-full object-cover">
                        <source src={media.url} type="video/mp4" />
                      </video>
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-all">
                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                          <Play className="text-white fill-white" size={24} />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="absolute top-4 left-4">
                    <div className={`p-2 rounded-xl backdrop-blur-md border border-white/10 ${media.type === 'image' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                      {media.type === 'image' ? <ImageIcon size={14}/> : <Film size={14}/>}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2">Related Event</p>
                    <p className="font-black italic text-sm text-primary uppercase truncate">{getEventName(media.eventId)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-base-content/5">
                    <span className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">{formatDate(media.uploadedAt)}</span>
                    <div className="flex gap-2">
                      <button className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-white transition-all"><Pencil size={14}/></button>
                      <button onClick={() => handleDelete(media.mediaId)} className="p-2.5 bg-error/10 text-error rounded-lg hover:bg-error hover:text-white transition-all"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredMedia.length === 0 && !isLoading && (
          <div className="py-20 text-center opacity-30 font-black uppercase tracking-widest italic">No matching media found</div>
        )}
      </div>

      {/* Unified Media Player/Viewer Modal */}
      {activeMedia && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setActiveMedia(null)}></div>
          <div className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center bg-transparent rounded-[2rem] overflow-hidden animate-in zoom-in duration-300">
             <button onClick={() => setActiveMedia(null)} className="absolute top-6 right-6 z-[210] p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/10 transition-all">
                <X size={24} />
             </button>
             
             {activeMedia.type === 'video' ? (
               <video controls autoPlay className="w-full h-full rounded-[2rem] border border-white/10 shadow-2xl">
                 <source src={activeMedia.url} type="video/mp4" />
                 Your browser does not support the video tag.
               </video>
             ) : (
               <img 
                 src={activeMedia.url} 
                 alt="Full Preview" 
                 className="max-w-full max-h-[85vh] object-contain rounded-[2rem] border border-white/10 shadow-2xl"
               />
             )}
          </div>
        </div>
      )}

      {/* Upload Modal (Glassmorphism) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 overflow-hidden animate-in fade-in zoom-in duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors">
              <X size={20} className="text-white/40" />
            </button>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6">Upload Media</h3>
            <form onSubmit={handleCreateMedia} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Assign Event</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none appearance-none"
                  required
                >
                  <option value="" className="bg-slate-900">SELECT EVENT...</option>
                  {events.map((event: Event) => (
                    <option key={event.eventId} value={event.eventId} className="bg-slate-900">{event.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Media Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'image' | 'video')}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white outline-none appearance-none"
                  required
                >
                  <option value="image" className="bg-slate-900">IMAGE</option>
                  <option value="video" className="bg-slate-900">VIDEO</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Select File</label>
                <input
                  type="file"
                  accept={type === 'image' ? 'image/*' : 'video/*'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-white/60 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-primary file:text-white"
                  required
                />
              </div>
              {uploadProgress > 0 && (
                <div className="space-y-2">
                   <progress className="progress progress-primary w-full h-1 bg-white/10" value={uploadProgress} max={100}></progress>
                   <p className="text-center text-[10px] font-black text-primary uppercase">{uploadProgress}% COMPLETE</p>
                </div>
              )}
              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-5 bg-primary hover:bg-primary/90 text-white font-black italic uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isCreating ? 'UPLOADING...' : 'CONFIRM UPLOAD'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMedia;