// Strapi v4 uses { id, attributes: {...} } format

// Media file attributes
export interface StrapiMediaAttributes {
  url: string;
}

// Media wrapper { data: { id, attributes } } or null
export interface StrapiMediaWrapper {
  data: {
    id: number;
    attributes: StrapiMediaAttributes;
  } | null;
}

// Child product attributes
export interface StrapiChildAttributes {
  name: string;
  slug_item: string;
  in_stock: boolean;
  hero_image?: StrapiMediaWrapper;
  ar_model_ios?: StrapiMediaWrapper;
  ar_model_and?: StrapiMediaWrapper;
}

// Child product item { id, attributes }
export interface StrapiChildItem {
  id: number;
  attributes: StrapiChildAttributes;
}

// Children relation wrapper { data: [...] }
export interface StrapiChildrenWrapper {
  data: StrapiChildItem[];
}

// Var product attributes
export interface StrapiVarProductAttributes {
  name: string;
  childrens?: StrapiChildrenWrapper;
}

// Var product item { id, attributes }
export interface StrapiVarProductItem {
  id: number;
  attributes: StrapiVarProductAttributes;
}

// Raw Strapi response
export interface StrapiResponse {
  data: StrapiVarProductItem[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Normalized types for frontend
export interface ProductChild {
  id: number;
  name: string;
  slug_item: string;
  in_stock: boolean;
  hero_image?: string;
  ar_model_ios?: string;
  ar_model_and?: string;
}

export interface VarProduct {
  id: number;
  name: string;
  childrens: ProductChild[];
}

export interface NormalizedResponse {
  data: VarProduct[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export type TestStatus = "not_tested" | "passed" | "failed";

export type AutoTestStatus = "not_tested" | "loading" | "passed" | "failed";

export interface ProductTestStatus {
  productId: number;
  iosStatus: TestStatus;
  androidStatus: TestStatus;
  iosAutoStatus?: AutoTestStatus;
  androidAutoStatus?: AutoTestStatus;
  humanVerified?: boolean;
   manualIncorrect?: boolean;
  notes?: string;
  lastUpdated: string;
}
