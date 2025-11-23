import gql from 'graphql-tag';
import { Collection, SearchInput } from '~/generated/graphql-shop';
import { shopSdk } from '~/graphql-wrapper';

export const getCollections = async () => {
	return await shopSdk
		.collections()
		.then((res) => {
			return res?.collections?.items as Collection[];
		})
		.catch((error) => {
			console.error('Error fetching collections:', error);
			return [];
		});
};

export const getCollectionBySlug = async (slug: string) => {
	const res = await shopSdk.collection({ slug });
	return res?.collection as Collection;
};

// Fetch products from a collection using search API with pagination
export const getCollectionProducts = async (
	collectionId: string,
	take: number = 20,
	skip: number = 0
) => {
	const searchInput: SearchInput = {
		collectionId,
		take,
		skip,
		groupByProduct: false, // Get variants directly
	};

	return await shopSdk.search({ input: searchInput }).then((res) => {
		const items = res.search?.items || [];
		const totalItems = res.search?.totalItems || 0;
		return {
			items,
			totalItems,
		};
	});
};

// GraphQL query for collections
gql`
	query collections {
		collections {
			items {
				id
				name
				slug
				parent {
					id
					slug
					name
				}
				featuredAsset {
					id
					preview
				}
			}
			totalItems
		}
	}
`;

// GraphQL query for a specific collection by slug
gql`
	query collection($slug: String, $id: ID) {
		collection(slug: $slug, id: $id) {
			id
			name
			slug
			breadcrumbs {
				id
				name
				slug
			}
			children {
				id
				name
				slug
				featuredAsset {
					id
					preview
				}
			}
		}
	}
`;
