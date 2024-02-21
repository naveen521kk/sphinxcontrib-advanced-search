interface SearchIndexItem {
    id: string;
    name: string;
    uri: string;
}

interface SearchIndex {
    [index: string]: SearchIndexItem[];
}

export type { SearchIndex, SearchIndexItem };
