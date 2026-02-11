import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClaimsService } from '../services/claims.service';
import { useToast } from '@/components/ui/Toast';
import type { ClaimFilters, ClaimResponsePayload, AcceptClaimPayload } from '../types/claims.types';

export const useClaims = (
  accountId: string,
  page: number = 1,
  limit: number = 50,
  filters?: ClaimFilters
) => {
  return useQuery({
    queryKey: ['claims', accountId, page, limit, filters],
    queryFn: () => ClaimsService.getClaims(accountId, page, limit, filters),
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useClaim = (accountId: string, claimId: string) => {
  return useQuery({
    queryKey: ['claims', accountId, claimId],
    queryFn: () => ClaimsService.getClaimById(accountId, claimId),
    enabled: !!accountId && !!claimId,
    staleTime: 1 * 60 * 1000,
  });
};

export const useRespondToClaim = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: ClaimResponsePayload;
    }) => ClaimsService.respondToClaim(accountId, payload),
    onSuccess: (_, { accountId, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['claims', accountId] });
      queryClient.invalidateQueries({ queryKey: ['claims', accountId, payload.claimId] });
      showToast('Resposta enviada com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao enviar resposta';
      showToast(message, 'error');
    },
  });
};

export const useAcceptClaim = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: AcceptClaimPayload;
    }) => ClaimsService.acceptClaim(accountId, payload),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['claims', accountId] });
      showToast('Reclamação aceita!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao aceitar reclamação';
      showToast(message, 'error');
    },
  });
};

export const useEscalateClaim = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      claimId,
      reason,
    }: {
      accountId: string;
      claimId: string;
      reason: string;
    }) => ClaimsService.escalateClaim(accountId, claimId, reason),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['claims', accountId] });
      showToast('Reclamação escalada!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao escalar reclamação';
      showToast(message, 'error');
    },
  });
};

export const useClaimsStats = (accountId: string) => {
  return useQuery({
    queryKey: ['claims', accountId, 'stats'],
    queryFn: () => ClaimsService.getStats(accountId),
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      accountId,
      claimId,
      file,
    }: {
      accountId: string;
      claimId: string;
      file: File;
    }) => ClaimsService.uploadDocument(accountId, claimId, file),
    onSuccess: (_, { accountId, claimId }) => {
      queryClient.invalidateQueries({ queryKey: ['claims', accountId, claimId] });
      showToast('Documento enviado com sucesso!', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao enviar documento';
      showToast(message, 'error');
    },
  });
};
