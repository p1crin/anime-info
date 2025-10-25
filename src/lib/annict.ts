export async function fetchAnnictWorks(token: string) {
  const query = `
    query {
      viewer {
        works(first: 50, orderBy: { field: SEASON, direction: DESC }) {
          nodes {
            id
            title
            seasonName
            staffs {
              edges {
                node { name roleText }
              }
            }
            casts {
              edges {
                node { name }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.annict.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  return data.data.viewer.works.nodes;
}
