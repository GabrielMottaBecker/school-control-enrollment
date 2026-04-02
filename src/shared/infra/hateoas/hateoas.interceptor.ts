import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { HATEOAS_ITEM_KEY, type HateoasItemOptions } from "./hateoas-item.decorator";
import { HATEOAS_LIST_KEY, type HateoasListOptions } from "./hateoas-list.decorator";
import type { PaginatedResult } from "./hateoas.types";

@Injectable()
export class HateoasInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const listOptions = this.reflector.get<HateoasListOptions>(
      HATEOAS_LIST_KEY,
      context.getHandler(),
    );
    const itemOptions = this.reflector.get<HateoasItemOptions>(
      HATEOAS_ITEM_KEY,
      context.getHandler(),
    );

    if (!listOptions && !itemOptions) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<{ query: Record<string, string> }>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (listOptions) {
          return this.transformList(
            data as PaginatedResult<Record<string, unknown>>,
            listOptions,
            request.query,
          );
        }
        return this.transformItem(
          data as Record<string, unknown> | null,
          itemOptions!,
        );
      }),
    );
  }

  private transformList(
    paginated: PaginatedResult<Record<string, unknown>>,
    options: HateoasListOptions,
    _query: Record<string, string>,
  ) {
    const { data, total, page, limit } = paginated;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const { basePath } = options;

    const itemsWithLinks = data.map((item) => ({
      ...item,
      _links: options.itemLinks(item),
    }));

    return {
      data: itemsWithLinks,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        currentPage: page,
        totalPages,
      },
      _links: {
        self: { href: `${basePath}?_page=${page}&_size=${limit}`, method: "GET" },
        next:
          page < totalPages
            ? { href: `${basePath}?_page=${page + 1}&_size=${limit}`, method: "GET" }
            : null,
        prev:
          page > 1
            ? { href: `${basePath}?_page=${page - 1}&_size=${limit}`, method: "GET" }
            : null,
        first: { href: `${basePath}?_page=1&_size=${limit}`, method: "GET" },
        last: { href: `${basePath}?_page=${totalPages}&_size=${limit}`, method: "GET" },
        create: { href: basePath, method: "POST" },
      },
    };
  }

  private transformItem(
    item: Record<string, unknown> | null,
    options: HateoasItemOptions,
  ) {
    if (!item) return null;
    return {
      ...item,
      _links: options.itemLinks(item),
    };
  }
}
