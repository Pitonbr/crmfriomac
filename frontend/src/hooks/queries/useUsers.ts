import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  getAuditLog,
  listUsers,
  resetUserPassword,
  toggleUser,
  type UserCreatePayload,
  type UserUpdatePayload,
  updateUser,
} from '@/api/users';

const USERS_KEY = ['users'] as const;
const AUDIT_KEY = ['audit-log'] as const;

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: listUsers, staleTime: 60_000 });
}

export function useAuditLog() {
  return useQuery({ queryKey: AUDIT_KEY, queryFn: getAuditLog, staleTime: 30_000 });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => createUser(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      void qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdatePayload }) =>
      updateUser(id, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useToggleUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleUser(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      void qc.invalidateQueries({ queryKey: AUDIT_KEY });
    },
  });
}

export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: AUDIT_KEY }),
  });
}
