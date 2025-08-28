// lib/services/materiel-presets-service.ts

export interface MaterielPreset {
  id: number;
  name: string;
  category?: string;
  categoryId?: number | null;
  discipline: string;
  description?: string;
  defaultQty?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaterielPresetCreateData {
  name: string;
  category?: string;
  categoryId?: number | null;
  discipline: string;
  description?: string;
  defaultQty?: number;
}

export interface MaterielPresetListResponse {
  presets: MaterielPreset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MaterielPresetSearchParams {
  discipline?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class MaterielPresetsService {
  private baseUrl = '/api/materiel-presets';

  async getPresets(params: MaterielPresetSearchParams = {}): Promise<MaterielPresetListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch presets: ${response.statusText}`);
    }

    return response.json();
  }

  async getPreset(id: number): Promise<MaterielPreset> {
    const response = await fetch(`${this.baseUrl}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch preset: ${response.statusText}`);
    }

    return response.json();
  }

  async createPreset(data: MaterielPresetCreateData): Promise<MaterielPreset> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create preset');
    }

    return response.json();
  }

  async updatePreset(id: number, data: Partial<MaterielPresetCreateData>): Promise<MaterielPreset> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update preset');
    }

    return response.json();
  }

  async deletePreset(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete preset');
    }
  }

  async searchPresets(query: string, discipline?: string): Promise<MaterielPreset[]> {
    const result = await this.getPresets({
      search: query,
      discipline,
      limit: 50,
    });

    return result.presets;
  }
}

export const materielPresetsService = new MaterielPresetsService();
