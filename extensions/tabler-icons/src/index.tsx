import { ActionPanel, Action, Color, Grid, Icon, Cache } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import fetch from "cross-fetch";

const ALL_CATEGORIES = "All";
const CACHE_ID = "tabler-icons";

const expire = 1000 * 60 * 60 * 24; // 24 hours
const isExpired = (timestamp: number) => Date.now() - timestamp > expire;

const cache = new Cache({});

function useIcons() {
  const abortable = useRef<AbortController>();
  const { isLoading, data } = usePromise(
    async () => {
      const cached = cache.get(CACHE_ID);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          // revalidate if cache is older than 24 hours
          if (!isExpired(timestamp)) {
            return data as SearchResult[];
          }
        } catch (error) {
          console.log(error);
        }
      }

      try {
        const response = await fetch("https://tabler-icons.io/icons.json", { signal: abortable.current?.signal });
        const result = await response.json();
        if (Array.isArray(result) && result.length > 0) {
          cache.set(CACHE_ID, JSON.stringify({ data: result, timestamp: Date.now() }));
          return result as SearchResult[];
        }
      } catch (error) {
        console.log(error);
      }

      return [];
    },
    [],
    {
      abortable,
    }
  );

  return { data, isLoading };
}

export default function Command() {
  // use icons with cache
  const { data, isLoading } = useIcons();

  const pageSize = 24;
  const [page, setPage] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const categories = [ALL_CATEGORIES, ...new Set(data?.map((item) => item.c) || [])].filter(Boolean);
  const filtered =
    data?.filter(
      (item) =>
        (category === ALL_CATEGORIES || item.c === category) &&
        (item.c.includes(searchText) || item.n.includes(searchText))
    ) || [];
  const pageTotal = Math.ceil(filtered?.length / pageSize) || 0;
  const pageData = filtered?.slice(page * pageSize, (page + 1) * pageSize) || [];

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabler icons..."
      throttle
      columns={8}
      inset={Grid.Inset.Large}
      searchBarAccessory={
        <Grid.Dropdown
          storeValue
          tooltip="Select Icon Catetory"
          onChange={(nextCategory) => {
            setCategory(nextCategory);
          }}
        >
          {categories.map((c) => (
            <Grid.Dropdown.Item key={c} title={c} value={c}></Grid.Dropdown.Item>
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.Section title={`Page ${page + 1} of ${pageTotal}`} subtitle={`Total ${filtered.length}`}>
        {pageData?.map((searchResult) => (
          <Grid.Item
            key={searchResult.n}
            content={{
              source: `data:image/svg+xml,${searchResult.s}`,
              tintColor: Color.PrimaryText,
            }}
            title={searchResult.n}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy React Component" content={`<${searchResult.r} />`} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy SVG" content={searchResult.s} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigate">
                  <Action
                    title="Previous Page"
                    icon={Icon.ArrowLeftCircle}
                    onAction={() => {
                      setPage((p) => Math.max(0, p - 1));
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "[" }}
                  />
                  <Action
                    title="Next Page"
                    icon={Icon.ArrowRightCircle}
                    onAction={() => {
                      setPage((p) => Math.min(pageTotal - 1, p + 1));
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "]" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

async function parseFetchResponse(response: Response) {
  const json = await response.json();

  if (Array.isArray(json) && json.length > 0) {
    return json as SearchResult[];
  }

  return [];
}

interface SearchResult {
  // category
  c: string;
  // name
  n: string;
  // react
  r: string;
  // svg
  s: string;
  // tooltip
  t: string;
  // unicode
  u: string;
  // unknown (size?)
  v: string;
}
