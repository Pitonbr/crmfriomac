import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentUser, login, type LoginPayload, logout } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const ME_KEY = ['auth', 'me'] as const;

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const user = await getCurrentUser();
      setUser(user);
      return user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data) => {
      setUser(data.user);
      qc.setQueryData(ME_KEY, data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clear();
      qc.removeQueries({ queryKey: ME_KEY });
      qc.clear();
    },
  });
}
