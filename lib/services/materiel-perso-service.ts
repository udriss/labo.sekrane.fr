// lib/services/materiel-perso-service.ts

import { MaterielCategorie } from './materiel-categories-service';

export interface MaterielPerso {
  id: number;
  name: string;
  discipline: string;
  description?: string;
  caracteristiques?: { [key: string]: any };
  defaultQty?: number;
  volumes?: string[];
  categorieId?: number;
  categorie?: MaterielCategorie;
  createdAt: string;
  updatedAt: string;
}

export interface MaterielPersoCreateData {
  name: string;
  discipline: string;
  description?: string;
  categorieId?: number;
  volumes?: string[];
  caracteristiques?: { [key: string]: any };
  defaultQty?: number;
}

export interface MaterielPersoListResponse {
  materielPersons: MaterielPerso[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MaterielPersoSearchParams {
  discipline?: string;
  categorieId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

class MaterielPersoService {
  private baseUrl = '/api/materiel-perso';

  async getMaterielPersons(
    params: MaterielPersoSearchParams = {},
  ): Promise<MaterielPersoListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch materiel perso: ${response.statusText}`);
    }

    return response.json();
  }

  async getMaterielPerso(id: number): Promise<MaterielPerso> {
    const response = await fetch(`${this.baseUrl}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch materiel perso: ${response.statusText}`);
    }

    return response.json();
  }

  async createMaterielPerso(data: MaterielPersoCreateData): Promise<MaterielPerso> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create materiel perso');
    }

    return response.json();
  }

  async updateMaterielPerso(
    id: number,
    data: Partial<MaterielPersoCreateData>,
  ): Promise<MaterielPerso> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update materiel perso');
    }

    return response.json();
  }

  async deleteMaterielPerso(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete materiel perso');
    }
  }

  async searchMaterielPersons(
    query: string,
    discipline?: string,
    categorieId?: number,
  ): Promise<MaterielPerso[]> {
    const result = await this.getMaterielPersons({
      search: query,
      discipline,
      categorieId,
      limit: 50,
    });

    return result.materielPersons;
  }
}

export const materielPersoService = new MaterielPersoService();
