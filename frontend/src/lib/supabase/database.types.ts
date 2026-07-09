export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					username: string | null;
					email: string;
					password_hash: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					username?: string | null;
					email: string;
					password_hash?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					username?: string | null;
					email?: string;
					password_hash?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			project_types: {
				Row: {
					id: string;
					name: string;
					slug: string;
					description: string | null;
					icon: string | null;
					template_version: string | null;
					metadata: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					slug: string;
					description?: string | null;
					icon?: string | null;
					template_version?: string | null;
					metadata?: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					slug?: string;
					description?: string | null;
					icon?: string | null;
					template_version?: string | null;
					metadata?: Json;
					created_at?: string;
				};
				Relationships: [];
			};
			projects: {
				Row: {
					id: string;
					owner_id: string;
					project_type_id: string;
					name: string;
					description: string | null;
					visibility: string;
					status: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					owner_id: string;
					project_type_id: string;
					name: string;
					description?: string | null;
					visibility?: string;
					status?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					owner_id?: string;
					project_type_id?: string;
					name?: string;
					description?: string | null;
					visibility?: string;
					status?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			project_members: {
				Row: {
					project_id: string;
					user_id: string;
					role: string;
					joined_at: string;
				};
				Insert: {
					project_id: string;
					user_id: string;
					role?: string;
					joined_at?: string;
				};
				Update: {
					project_id?: string;
					user_id?: string;
					role?: string;
					joined_at?: string;
				};
				Relationships: [];
			};
			project_data: {
				Row: {
					id: string;
					project_id: string;
					key: string;
					value: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					key: string;
					value: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					key?: string;
					value?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			chat_messages: {
				Row: {
					id: string;
					project_id: string;
					user_id: string | null;
					role: string;
					content: string;
					tool_calls: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					user_id?: string | null;
					role: string;
					content: string;
					tool_calls?: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					user_id?: string | null;
					role?: string;
					content?: string;
					tool_calls?: Json;
					created_at?: string;
				};
				Relationships: [];
			};
			forum_posts: {
				Row: {
					id: string;
					subject_slug: string;
					user_id: string;
					title: string | null;
					body: string;
					rating: number | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					subject_slug: string;
					user_id: string;
					title?: string | null;
					body: string;
					rating?: number | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					subject_slug?: string;
					user_id?: string;
					title?: string | null;
					body?: string;
					rating?: number | null;
					created_at?: string;
				};
				Relationships: [];
			};
			forum_subjects: {
				Row: {
					id: string;
					slug: string;
					title: string;
					description: string | null;
					created_by: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					slug: string;
					title: string;
					description?: string | null;
					created_by?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					slug?: string;
					title?: string;
					description?: string | null;
					created_by?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
			forum_votes: {
				Row: {
					id: string;
					post_id: string;
					user_id: string;
					value: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					post_id: string;
					user_id: string;
					value: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					post_id?: string;
					user_id?: string;
					value?: number;
					created_at?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
	};
}
