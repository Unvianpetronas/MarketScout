import { api } from "@/lib/api";
import { ContractDetail, ContractSummary, LinkResponse, LinkSummary } from "@/types/contract";

export const uploadContract = async (file: File): Promise<ContractSummary> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<ContractSummary>("/contracts", formData, {
    // The api instance defaults Content-Type to application/json — for a
    // multipart upload that must be unset so the browser can generate the
    // correct "multipart/form-data; boundary=..." header itself.
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

export const listContracts = async (search?: string): Promise<ContractSummary[]> => {
  const response = await api.get<ContractSummary[]>("/contracts", { params: { search } });
  return response.data;
};

export const getContract = async (id: string): Promise<ContractDetail> => {
  const response = await api.get<ContractDetail>(`/contracts/${id}`);
  return response.data;
};

export const deleteContract = async (id: string): Promise<void> => {
  await api.delete(`/contracts/${id}`);
};

export const renameContract = async (id: string, fileName: string): Promise<ContractSummary> => {
  const response = await api.patch<ContractSummary>(`/contracts/${id}`, { fileName });
  return response.data;
};

export const listContractLinks = async (reportId: string): Promise<LinkSummary[]> => {
  const response = await api.get<LinkSummary[]>(`/assessments/${reportId}/contracts`);
  return response.data;
};

export const linkContract = async (reportId: string, contractId: string): Promise<LinkResponse> => {
  const response = await api.post<LinkResponse>(`/assessments/${reportId}/contracts/${contractId}/link`);
  return response.data;
};

export const updateFieldOverride = async (
  reportId: string,
  contractId: string,
  field: string,
  value: unknown
): Promise<LinkResponse> => {
  const response = await api.patch<LinkResponse>(
    `/assessments/${reportId}/contracts/${contractId}/fields`,
    { field, value }
  );
  return response.data;
};

export const unlinkContract = async (reportId: string, contractId: string): Promise<void> => {
  await api.delete(`/assessments/${reportId}/contracts/${contractId}/link`);
};
