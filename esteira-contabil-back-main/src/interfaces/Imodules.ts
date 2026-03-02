export interface ICreateModules {
  ds_module: string;
}

export interface IProfilesModules {
  id_profile: string;
  id_module: string;
  dt_ativacao: Date;
  is_activated: boolean;
  dt_updated?: Date;
}

export interface IEmpresasModules {
  id_empresa: string;
  id_module: string;
  dt_ativacao: Date;
  is_activated: boolean;
  dt_updated?: Date;
}

export interface IAccess {
  id_empresa?: string;
  id_profile?: string;
  id_module: string;
  is_activated: string;
}
