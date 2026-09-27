import { useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { PuffLoader } from "react-spinners";
import { venueApi } from "../../features/APIS/VenueApi";
import { FaEdit, FaSearch, FaChevronLeft, FaChevronRight, FaCalendarAlt, FaUsers, FaMapMarkerAlt } from "react-icons/fa";
import { useSelector } from "react-redux";
import type { RootState } from "../../App/store";
import { FaDeleteLeft } from "react-icons/fa6";

const MySwal = withReactContent(Swal);

interface VenueData {
  venueId: number;
  name: string;
  address: string;
  capacity: number;
  createdAt: string;
}

export const AllVenues = () => {
  const {
    data: allVenues = [],
    isLoading,
    error,
    refetch,
  } = venueApi.useGetAllVenuesQuery(undefined, {
    pollingInterval: 60_000,
    refetchOnMountOrArgChange: true,
  });

  const [createVenue] = venueApi.useCreateVenueMutation();
  const [updateVenue] = venueApi.useUpdateVenueMutation();
  const [deleteVenue] = venueApi.useDeleteVenueMutation();
  const firstName = useSelector((state: RootState) => state.auth.user?.firstName);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredVenues = allVenues.filter((v: VenueData) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVenues.length / itemsPerPage);
  const paginatedVenues = filteredVenues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Glassmorphism Modal Config ---
  const glassModalConfig = {
    background: "rgba(15, 23, 42, 0.8)",
    color: "#fff",
    customClass: {
      popup: "rounded-[2rem] border border-white/10 backdrop-blur-xl shadow-2xl w-[95%] max-w-lg",
      input: "!bg-slate-800/50 !text-white !rounded-xl !border-white/10 !text-sm swal2-input",
      confirmButton: "!rounded-xl !bg-primary !px-8 !py-3 !text-xs !font-black !uppercase",
      cancelButton: "!rounded-xl !bg-slate-700 !px-8 !py-3 !text-xs !font-black !uppercase"
    }
  };

  const openVenueModal = async (initial?: VenueData) => {
    const { value } = await MySwal.fire({
      ...glassModalConfig,
      title: initial ? "EDIT VENUE" : "ADD NEW VENUE",
      html: `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input id="venue-name" class="swal2-input" placeholder="Venue Name" value="${initial?.name ?? ""}" style="margin: 10px 0;">
          <input id="venue-address" class="swal2-input" placeholder="Address" value="${initial?.address ?? ""}" style="margin: 10px 0;">
          <input id="venue-capacity" class="swal2-input" type="number" placeholder="Capacity" value="${initial?.capacity ?? ""}" style="margin: 10px 0;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: initial ? "UPDATE" : "CREATE",
      preConfirm: () => {
        const name = (document.getElementById("venue-name") as HTMLInputElement).value.trim();
        const address = (document.getElementById("venue-address") as HTMLInputElement).value.trim();
        const capacity = Number((document.getElementById("venue-capacity") as HTMLInputElement).value);

        if (!name || !address || !capacity) {
          Swal.showValidationMessage("All fields are required.");
          return;
        }
        return { name, address, capacity, venueId: initial?.venueId };
      },
    });

    if (!value) return;

    try {
      if (value.venueId) {
        await updateVenue(value).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "UPDATED!", icon: "success", timer: 1500, showConfirmButton: false });
      } else {
        await createVenue(value).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "CREATED!", icon: "success", timer: 1500, showConfirmButton: false });
      }
      refetch();
    } catch (err: any) {
      MySwal.fire({ ...glassModalConfig, title: "ERROR", text: "Failed to save venue.", icon: "error" });
    }
  };

  const handleDelete = async (venueId: number) => {
    const confirm = await MySwal.fire({
      ...glassModalConfig,
      title: "DELETE VENUE?",
      text: "This cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "YES, DELETE",
    });

    if (confirm.isConfirmed) {
      try {
        await deleteVenue(venueId).unwrap();
        MySwal.fire({ ...glassModalConfig, title: "DELETED!", icon: "success", timer: 1500, showConfirmButton: false });
        refetch();
      } catch {
        MySwal.fire({ ...glassModalConfig, title: "ERROR", icon: "error" });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-100">
        <PuffLoader color="hsl(var(--p))" size={60} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 pb-32 font-sans md:p-8"> {/* pb-32 for fixed bottom nav */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-base-200/50 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-base-content/5 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter">
              👋 HEY <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Venue Management Portal</p>
          </div>
          <button onClick={() => openVenueModal()} className="btn btn-primary btn-sm rounded-xl px-6 font-black uppercase italic">
            Add Venue
          </button>
        </div>

        {/* Search Filter */}
        <div className="bg-base-200/30 p-4 rounded-[2rem] relative">
          <FaSearch className="absolute left-8 top-1/2 -translate-y-1/2 opacity-20" />
          <input
            type="text"
            placeholder="SEARCH BY VENUE NAME..."
            className="w-full pl-12 pr-4 py-4 bg-base-100/50 rounded-2xl border border-base-content/5 text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-primary/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List Content */}
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block bg-base-200/30 backdrop-blur-md rounded-[2.5rem] p-6">
            <table className="table w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest opacity-30">
                  <th className="px-8">Venue Name</th>
                  <th>Address</th>
                  <th>Capacity</th>
                  <th>Added On</th>
                  <th className="text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVenues.map((v: any) => (
                  <tr key={v.venueId} className="bg-base-100/40 hover:bg-base-100/80 transition-all border-none">
                    <td className="px-8 py-5 rounded-l-3xl font-black uppercase text-xs italic">{v.name}</td>
                    <td className="text-xs opacity-70">{v.address}</td>
                    <td className="font-bold text-xs">{v.capacity} Pax</td>
                    <td className="text-[10px] opacity-40">{new Date(v.createdAt).toLocaleDateString()}</td>
                    <td className="rounded-r-3xl text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openVenueModal(v)} className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><FaEdit size={12}/></button>
                        <button onClick={() => handleDelete(v.venueId)} className="p-2.5 bg-error/10 text-error rounded-lg hover:bg-error hover:text-white transition-all"><FaDeleteLeft size={12}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {paginatedVenues.map((v: any) => (
              <div key={v.venueId} className="bg-base-200/50 backdrop-blur-md p-5 rounded-[1.5rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-black italic text-sm text-primary uppercase">{v.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => openVenueModal(v)} className="p-3 bg-blue-500/20 text-blue-500 rounded-xl"><FaEdit size={14}/></button>
                    <button onClick={() => handleDelete(v.venueId)} className="p-3 bg-error/20 text-error rounded-xl"><FaDeleteLeft size={14}/></button>
                  </div>
                </div>
                
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 opacity-70 text-[10px]">
                    <FaMapMarkerAlt className="text-primary"/> <span>{v.address}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-70 text-[10px]">
                      <FaUsers className="text-primary"/> <span>{v.capacity} CAPACITY</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-30 text-[9px] font-black">
                      <FaCalendarAlt/> {new Date(v.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {filteredVenues.length > itemsPerPage && (
          <div className="flex justify-between items-center bg-base-200/30 p-4 rounded-2xl">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 bg-base-100 rounded-xl disabled:opacity-20"><FaChevronLeft size={10}/></button>
            <span className="text-[10px] font-black italic text-primary uppercase">Page {currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 bg-base-100 rounded-xl disabled:opacity-20"><FaChevronRight size={10}/></button>
          </div>
        )}

        {filteredVenues.length === 0 && <div className="py-20 text-center opacity-30 font-black uppercase tracking-widest italic">No Venues Found</div>}
      </div>
    </div>
  );
};