export interface Activity {
  id: string;
  companyKey: string;
  type: 'comment' | 'change';
  ts: number;
  author: string | null;
  text: string;
}

export interface CompanyMetaEntry {
  id: string;
  ts: number;
  text: string;
  author: string | null;
  type: 'comment' | 'change';
}

export interface CompanyMeta {
  [companyKey: string]: {
    comments: CompanyMetaEntry[];
    changeLog: CompanyMetaEntry[];
  };
}
