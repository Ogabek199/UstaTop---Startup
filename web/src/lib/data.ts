import { api, type MasterProfile, type Service } from "./api";
import { MOCK_PROFESSIONALS, MOCK_SERVICES } from "./mock-data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function getServices(): Promise<Service[]> {
  if (USE_MOCK) return MOCK_SERVICES;
  try {
    const data = await api.getServices();
    return data.length > 0 ? data : MOCK_SERVICES;
  } catch {
    return MOCK_SERVICES;
  }
}

export async function getProfessionals(
  params: Record<string, string | number | undefined> = {},
): Promise<MasterProfile[]> {
  const limit = Number(params.limit) || 20;

  try {
    const { items } = await api.searchProfessionals(params);
    if (items.length > 0) return items.slice(0, limit);
  } catch {
    // fallback below
  }

  return filterMockPros({ ...params, limit });
}

export async function getProfessional(id: string): Promise<MasterProfile | null> {
  try {
    const pro = await api.getProfessional(id);
    return pro;
  } catch {
    return (
      MOCK_PROFESSIONALS.find((p) => p.id === id || p.userId === id) ?? null
    );
  }
}

function filterMockPros(
  params: Record<string, string | number | undefined>,
): MasterProfile[] {
  let list = [...MOCK_PROFESSIONALS];

  if (params.category && params.category !== "all") {
    list = list.filter((p) =>
      p.serviceCategoryIds.includes(String(params.category)),
    );
  }

  if (params.district) {
    list = list.filter((p) => p.district === params.district);
  }

  if (params.q) {
    const q = String(params.q).toLowerCase();
    list = list.filter(
      (p) =>
        p.user.name?.toLowerCase().includes(q) ||
        p.bio?.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q),
    );
  }

  const limit = Number(params.limit) || list.length;
  return list.slice(0, limit);
}
