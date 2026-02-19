export interface Guide {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_image: string | null;
    neighborhood: string | null;
    curator_name: string | null;
    created_at?: string;
}

export interface GuideItem {
    id: string;
    guide_id: string;
    venue_id: string;
    order_index: number;
    curator_note: string | null;
    // Joined fields
    venues?: {
        name: string;
        lat: number;
        lng: number;
        neighborhood: string;
        address?: string;
        url?: string;
        image_url?: string; // NEW
    }
}

export interface GuideWithItems extends Guide {
    items: GuideItem[];
}
