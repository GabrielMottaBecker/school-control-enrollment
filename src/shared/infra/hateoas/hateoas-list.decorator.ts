import { SetMetadata } from "@nestjs/common";
import type { LinksMap } from "./hateoas.types";

export const HATEOAS_LIST_KEY = "hateoas:list";

export interface HateoasListOptions<T = Record<string, unknown>> {
  basePath: string;
  itemLinks: (item: T) => LinksMap;
}

export const HateoasList = <T>(options: HateoasListOptions<T>) =>
  SetMetadata(HATEOAS_LIST_KEY, options);
