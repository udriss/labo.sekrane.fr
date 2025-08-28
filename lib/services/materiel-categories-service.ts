// lib/services/materiel-categories-service.ts

export interface MaterielCategorie {
  id: number;
  name: string;
  discipline: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    materielPersons: number;
  };
  materielPersons?: MaterielPerso[];
}

export interface MaterielCategorieCreateData {
  name: string;
  discipline: string;
  description?: string;
}

import { MaterielPerso } from './materiel-perso-service';

class MaterielCategoriesService {
  private baseUrl = '/api/materiel-categories';

  async getCategories(discipline?: string): Promise<MaterielCategorie[]> {
    const searchParams = new URLSearchParams();

    if (discipline && discipline !== 'all') {
      searchParams.append('discipline', discipline);
    }

    const response = await fetch(`${this.baseUrl}?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }

    return response.json();
  }

  async getCategory(id: number): Promise<MaterielCategorie> {
    const response = await fetch(`${this.baseUrl}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.statusText}`);
    }

    return response.json();
  }

  async createCategory(data: MaterielCategorieCreateData): Promise<MaterielCategorie> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }

    return response.json();
  }

  async updateCategory(
    id: number,
    data: Partial<MaterielCategorieCreateData>,
  ): Promise<MaterielCategorie> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update category');
    }

    return response.json();
  }

  async deleteCategory(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete category');
    }
  }
}

export const materielCategoriesService = new MaterielCategoriesService();
