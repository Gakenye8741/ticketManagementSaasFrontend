import { useSelector } from "react-redux";
import { skipToken } from "@reduxjs/toolkit/query";
import { type RootState } from "../App/store";
import { useGetUserOrganizationsQuery } from "../features/APIS/organizationApi";
import type { OrgMember } from "../features/APIS/organizationApi";

/**
 * Finds the organization the logged-in organizer really belongs to.
 *
 * There is NO fallback to a default organization. If the user has not created or
 * joined an organization yet, `orgId` is undefined and `hasOrg` is false, so pages
 * can ask them to create one instead of showing someone else's data.
 */
export const useOrganizerOrg = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const digitalId = Number(user?.digitalId || user?.id) || undefined;
  const userOrgId = Number(user?.orgId || user?.organizationId) || undefined;

  const { data, isLoading, isError } = useGetUserOrganizationsQuery(digitalId ?? skipToken);

  const memberships: OrgMember[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
    ? (data as any).data
    : [];

  const membershipOrgId = Number(memberships[0]?.orgId) || undefined;

  // The memberships are the source of truth. The orgId stored on the logged-in
  // user is only used if memberships cannot be loaded at all.
  const orgId = membershipOrgId ?? (isError || !digitalId ? userOrgId : undefined);

  return {
    orgId,
    hasOrg: Boolean(orgId),
    isLoading: Boolean(digitalId) && isLoading,
    memberships,
  };
};

export default useOrganizerOrg;