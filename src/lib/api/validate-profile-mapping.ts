import type { ValidateProfileMappingPayload, ValidateProfileMappingResponse } from '@/types/machine-config';
import { buildApiUrl } from '@/lib/api/client';

interface ApiResponse<T> {
  success: boolean;
  errorCode?: string;
  message?: string;
  data: T | null;
}

export async function validateProfileMapping(
  payload: ValidateProfileMappingPayload,
): Promise<{
  valid: boolean;
  error?: string;
  response?: ValidateProfileMappingResponse;
}> {
  try {
    const response = await fetch(buildApiUrl('/api/v1/machine-configs/validate-profile-mapping'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: ApiResponse<ValidateProfileMappingResponse> = await response.json();

    if (!response.ok || !data.success) {
      return {
        valid: false,
        error: data.message || `Validation failed: ${response.statusText}`,
      };
    }

    return {
      valid: data.data?.valid ?? false,
      response: data.data ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      valid: false,
      error: message,
    };
  }
}

