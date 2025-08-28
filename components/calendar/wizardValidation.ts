// Centralised validation logic for Event / Preset wizards
// ------------------------------------------------------
// REQUIRED STEPS: Modify this array to change mandatory steps for recap validation.
// Possible keys: 'method', 'description', 'timeSlots', 'resources', 'documents'
// By default only fundamental steps are required.
export const REQUIRED_STEPS: WizardStepKey[] = ['method', 'description'];

export type WizardStepKey = 'method' | 'description' | 'timeSlots' | 'resources' | 'documents';

export interface WizardValidationInput {
  uploadMethod: string | null | undefined;
  selectedFilesCount: number;
  uploadsCount: number;
  materialsCount?: number;
  chemicalsCount?: number;
  title: string;
  timeSlots: Array<{ date: any; startTime: string | null; endTime: string | null }>;
  presetOnly?: boolean; // if true, method step becomes implicitly valid
}

export interface WizardValidationResult {
  method: boolean;
  description: boolean;
  timeSlots: boolean;
  resources: boolean;
  documents: boolean;
  recapValid: boolean;
  validityMap: Record<WizardStepKey, boolean>;
}

export function computeWizardValidation(input: WizardValidationInput): WizardValidationResult {
  const {
    uploadMethod,
    selectedFilesCount,
    uploadsCount,
    materialsCount = 0,
    chemicalsCount = 0,
    title,
    timeSlots,
    presetOnly,
  } = input;
  const method = presetOnly
    ? true
    : !!uploadMethod && (uploadMethod !== 'file' || selectedFilesCount > 0 || uploadsCount > 0);
  const description = !!(title || '').trim();
  const timeSlotsValid =
    timeSlots.length > 0 &&
    timeSlots.every(
      (s) => s.date && s.startTime && s.endTime && (s.startTime as string) < (s.endTime as string),
    );
  // Optional steps become "valid" only if user provided something
  const resources = materialsCount + chemicalsCount > 0;
  const documents = uploadsCount > 0;
  const validityMap: Record<WizardStepKey, boolean> = {
    method,
    description,
    timeSlots: timeSlotsValid,
    resources,
    documents,
  };
  const recapValid = REQUIRED_STEPS.every((k) => validityMap[k]);
  return {
    method,
    description,
    timeSlots: timeSlotsValid,
    resources,
    documents,
    recapValid,
    validityMap,
  };
}

export function stepOrder(presetOnly: boolean): WizardStepKey[] {
  return presetOnly
    ? ['description', 'timeSlots', 'resources', 'documents'] // recap not included here
    : ['method', 'description', 'timeSlots', 'resources', 'documents'];
}
