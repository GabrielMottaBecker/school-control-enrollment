import { SetMetadata } from "@nestjs/common";
import type { LinksMap } from "./hateoas.types";

export const HATEOAS_ITEM_KEY = "hateoas:item";

export interface HateoasItemOptions<T = Record<string, unknown>> {
  basePath: string;
  itemLinks: (item: T) => LinksMap;
}

export const HateoasItem = <T>(options: HateoasItemOptions<T>) =>
  SetMetadata(HATEOAS_ITEM_KEY, options);
