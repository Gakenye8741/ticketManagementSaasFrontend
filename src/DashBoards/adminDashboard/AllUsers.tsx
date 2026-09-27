import { useState } from "react";
import { useSelector } from "react-redux";
import { PuffLoader } from "react-spinners";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  useDeleteUserMutation,
  useGetAllUsersProfilesQuery,
  useUpdateAdminUserMutation,
  useSendEmailNotificationMutation,
} from "../../features/APIS/UserApi";

import "../adminDashboard/style.css";
import { FaEdit, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FaTrashCan, FaUserShield, FaUserGroup, FaPaperPlane, FaBullhorn } from "react-icons/fa6";

/**
 * Interface for User Data
 */
interface userData {
  nationalId: number;
  address: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const MySwal = withReactContent(Swal);

export const AllUsers = () => {
  // --- API Hooks ---
  const { data: AllUsersData = [], isLoading, error } = useGetAllUsersProfilesQuery(undefined, { pollingInterval: 30000 });
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateAdminUserMutation();
  const [sendEmailNotification, { isLoading: isSendingEmail }] = useSendEmailNotificationMutation();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; 

  const admin = useSelector((state: any) => state.auth.user);
  const adminName = admin?.firstName || "Admin";

  // --- Search Logic ---
  const filteredUsers = AllUsersData.filter((user: userData) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(lowerSearch) ||
      user.lastName.toLowerCase().includes(lowerSearch) ||
      user.nationalId.toString().includes(lowerSearch)
    );
  });

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const glassModalConfig = {
    background: "rgba(15, 23, 42, 0.85)",
    color: "#f8fafc",
    customClass: {
      popup: "glass-modal rounded-[2.5rem] border border-blue-500/20 shadow-2xl backdrop-blur-xl",
      confirmButton: "!rounded-xl !bg-primary !px-8 !py-3 !text-xs !font-black !uppercase",
      cancelButton: "!rounded-xl !bg-slate-800 !px-8 !py-3 !text-xs !font-black !uppercase text-slate-300",
    }
  };

  // --- Action Handlers ---

  const handleDelete = async (nationalId: number) => {
    const confirm = await MySwal.fire({
      ...glassModalConfig,
      title: "Confirm Deletion",
      text: "This user profile will be permanently removed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#374151",
      confirmButtonText: "Yes, delete it",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteUser(nationalId).unwrap();
        MySwal.fire({
          ...glassModalConfig,
          title: "Success",
          text: "User profile removed.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch {
        MySwal.fire({ ...glassModalConfig, title: "Error", text: "Delete operation failed.", icon: "error" });
      }
    }
  };

  const handleEdit = async (user: userData) => {
    const { value: formValues } = await MySwal.fire({
      ...glassModalConfig,
      title: `Update ${user.firstName}'s Profile`,
      html: `
        <div class="flex flex-col gap-4 p-4 text-left">
          <div class="grid grid-cols-2 gap-3">
             <div>
               <label class="text-[10px] uppercase font-black opacity-40 ml-2">First Name</label>
               <input id="swal-input1" class="swal2-input !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700" value="${user.firstName}">
             </div>
             <div>
               <label class="text-[10px] uppercase font-black opacity-40 ml-2">Last Name</label>
               <input id="swal-input2" class="swal2-input !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700" value="${user.lastName}">
             </div>
          </div>
          <div>
            <label class="text-[10px] uppercase font-black opacity-40 ml-2">Email Address</label>
            <input id="swal-input3" class="swal2-input !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700" value="${user.email}">
          </div>
          <div class="relative">
            <label class="text-[10px] uppercase font-black opacity-40 ml-2">Password (Change or View)</label>
            <input id="swal-input4" type="password" class="swal2-input !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700" placeholder="••••••••">
            <button type="button" id="togglePassword" class="absolute right-4 bottom-3 text-primary text-xs font-bold uppercase tracking-widest">Show</button>
          </div>
          <div>
            <label class="text-[10px] uppercase font-black opacity-40 ml-2">Access Role</label>
            <select id="swal-input5" class="swal2-input !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700">
              <option value="user" ${user.role === "user" ? "selected" : ""}>Standard User</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrator</option>
            </select>
          </div>
        </div>
      `,
      didOpen: () => {
        const toggleBtn = document.getElementById("togglePassword");
        const passwordInput = document.getElementById("swal-input4") as HTMLInputElement;
        toggleBtn?.addEventListener("click", () => {
          const isPassword = passwordInput.type === "password";
          passwordInput.type = isPassword ? "text" : "password";
          toggleBtn.innerText = isPassword ? "Hide" : "Show";
        });
      },
      preConfirm: () => {
        const firstName = (document.getElementById("swal-input1") as HTMLInputElement).value;
        const lastName = (document.getElementById("swal-input2") as HTMLInputElement).value;
        const email = (document.getElementById("swal-input3") as HTMLInputElement).value;
        const password = (document.getElementById("swal-input4") as HTMLInputElement).value;
        const role = (document.getElementById("swal-input5") as HTMLSelectElement).value;

        if (!firstName || !lastName || !email) {
          Swal.showValidationMessage("Please fill in the required fields.");
          return false;
        }

        const payload: any = { nationalId: user.nationalId, firstName, lastName, email, role };
        if (password) payload.password = password;
        return payload;
      },
    });

    if (formValues) {
      try {
        await updateUser(formValues).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "Updated", icon: "success", timer: 1500, showConfirmButton: false });
      } catch {
        MySwal.fire({ ...glassModalConfig, title: "Update Failed", icon: "error" });
      }
    }
  };

  const handleSendEmailModal = async (targetUser?: userData) => {
    const isBroadcast = !targetUser;
    const titleText = isBroadcast ? "Broadcast Email to All Users" : `Send Email to ${targetUser.firstName} ${targetUser.lastName}`;

    const { value: formValues } = await MySwal.fire({
      ...glassModalConfig,
      title: titleText,
      html: `
        <div class="flex flex-col gap-4 p-4 text-left">
          <div>
            <label class="text-[10px] uppercase font-black opacity-40 ml-2">Subject</label>
            <input id="swal-email-subject" class="swal2-input !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700" placeholder="e.g. Important Update">
          </div>
          <div>
            <label class="text-[10px] uppercase font-black opacity-40 ml-2">Message Body (HTML Supported)</label>
            <textarea id="swal-email-content" rows="4" class="swal2-textarea !m-0 !w-full !rounded-xl !bg-slate-800/50 !border-slate-700 !p-3 !text-xs !text-white" placeholder="<p>Write your message here...</p>"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Send Notification",
      preConfirm: () => {
        const subject = (document.getElementById("swal-email-subject") as HTMLInputElement).value;
        const htmlContent = (document.getElementById("swal-email-content") as HTMLTextAreaElement).value;

        if (!subject || !htmlContent) {
          Swal.showValidationMessage("Please enter both subject and message content.");
          return false;
        }

        const payload: any = { subject, htmlContent };
        if (!isBroadcast && targetUser) {
          payload.targetNationalId = targetUser.nationalId;
        }
        return payload;
      },
    });

    if (formValues) {
      try {
        await sendEmailNotification(formValues).unwrap();
        MySwal.fire({
          ...glassModalConfig,
          title: "Email Sent Successfully!",
          text: isBroadcast ? "Your broadcast email has been dispatched." : `Notification sent to ${targetUser?.firstName}.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        MySwal.fire({
          ...glassModalConfig,
          title: "Failed to Send Email",
          text: "Please check network or server connection.",
          icon: "error",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-4 md:p-8 font-sans transition-all duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-base-200/50 backdrop-blur-xl p-8 rounded-[2rem] border border-base-content/5 shadow-2xl">
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-base-content">
              👋 Welcome, <span className="text-primary">{adminName}</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-2 ml-1">Central User Registry Dashboard</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
             <button
               onClick={() => handleSendEmailModal()}
               disabled={isSendingEmail}
               className="btn btn-primary btn-sm rounded-xl px-6 font-black uppercase italic tracking-wider flex items-center gap-2 shadow-lg shadow-primary/20"
             >
               <FaBullhorn size={14} /> Broadcast Email
             </button>
          </div>
        </div>

        {/* Main Table Interface */}
        <div className="bg-base-200/30 backdrop-blur-md border border-base-content/5 rounded-[3rem] shadow-inner p-6 md:p-10">
          
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-10">
            <h2 className="text-xl font-black uppercase tracking-tighter italic">
              User Directory <span className="text-primary opacity-50">[{filteredUsers.length}]</span>
            </h2>
            
            <div className="relative w-full lg:max-w-md group">
              <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
              <input
                type="text"
                placeholder="Search by name, email or ID..."
                className="w-full pl-14 pr-6 py-4 bg-base-100/50 rounded-2xl border border-base-content/10 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-[10px] tracking-[0.2em] uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="p-20 text-center bg-error/10 rounded-[2rem] border border-error/20">
               <p className="text-error font-black uppercase tracking-widest">System Sync Error</p>
               <button onClick={() => window.location.reload()} className="mt-4 text-xs font-bold underline opacity-50">Retry Connection</button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-6">
              <PuffLoader color="hsl(var(--p))" size={60} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 animate-pulse">Initializing Data Stream...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-[2rem]">
                <table className="table w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 border-none">
                      <th className="bg-transparent px-8">Member Identity</th>
                      <th className="bg-transparent">Credential</th>
                      <th className="bg-transparent">Role status</th>
                      <th className="bg-transparent">Registration</th>
                      <th className="bg-transparent text-right pr-8">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user: userData, index: number) => (
                      <tr key={index} className="bg-base-100/40 hover:bg-base-100/80 transition-all border-none">
                        <td className="px-8 py-5 rounded-l-3xl">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center font-black text-primary italic shadow-inner">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                              <p className="font-black text-xs uppercase tracking-tighter">{user.firstName} {user.lastName}</p>
                              <p className="text-[10px] opacity-40 font-bold italic tracking-wider">ID: {user.nationalId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-[11px] font-bold opacity-60 italic">{user.email}</td>
                        <td>
                          <div className={`badge badge-outline gap-2 font-black italic uppercase text-[8px] tracking-[0.2em] p-3 rounded-xl ${
                            user.role === 'admin' ? "badge-primary shadow-lg shadow-primary/10" : "opacity-40"
                          }`}>
                            {user.role === 'admin' ? <FaUserShield size={10}/> : <FaUserGroup size={10}/>}
                            {user.role}
                          </div>
                        </td>
                        <td className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="rounded-r-3xl text-right pr-8">
                          <div className="flex justify-end gap-3 transition-opacity">
                            <button 
                              onClick={() => handleSendEmailModal(user)}
                              className="p-3 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                              title="Send Email"
                            >
                              <FaPaperPlane size={14} />
                            </button>
                            <button 
                              onClick={() => handleEdit(user)}
                              className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                              title="Edit Profile"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(user.nationalId)}
                              className="p-3 bg-error/10 text-error rounded-xl hover:bg-error hover:text-white transition-all shadow-sm"
                              title="Delete User"
                            >
                              <FaTrashCan size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-base-content/5 gap-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">
                  Showing {paginatedUsers.length} of {filteredUsers.length} total entries
                </p>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-4 rounded-2xl bg-base-100 border border-base-content/5 hover:bg-primary/10 disabled:opacity-20 transition-all shadow-md cursor-pointer"
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black italic text-primary">{currentPage}</span>
                    <span className="text-xs font-black opacity-20 mx-1">/</span>
                    <span className="text-xs font-black opacity-40">{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-4 rounded-2xl bg-base-100 border border-base-content/5 hover:bg-primary/10 disabled:opacity-20 transition-all shadow-md cursor-pointer"
                  >
                    <FaChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};