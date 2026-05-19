# Graph Report - Travelmind-Frontend-Ai  (2026-05-19)

## Corpus Check
- 243 files · ~106,208 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1531 nodes · 2481 edges · 127 communities (97 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6619c2b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 104 edges
2. `useColors()` - 37 edges
3. `compilerOptions` - 22 edges
4. `run_weather_agent()` - 18 edges
5. `AgentContext` - 16 edges
6. `expo` - 15 edges
7. `Button` - 14 edges
8. `get_cache()` - 14 edges
9. `run_culture_agent()` - 13 edges
10. `run_driving_agent()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `cache_clear_all()` --calls--> `clear_prefix()`  [INFERRED]
  backend/main.py → backend/utils/cache.py
- `cache_clear_prefix()` --calls--> `clear_prefix()`  [INFERRED]
  backend/main.py → backend/utils/cache.py
- `run_weather_workflow()` --calls--> `run_weather_agent()`  [INFERRED]
  backend/orchestration/session_orchestrator.py → backend/agents/weather_agent.py
- `search_transport_ors()` --calls--> `geocode_city()`  [INFERRED]
  backend/tools/budget_tool.py → backend/tools/weather_tool.py
- `Chip()` --calls--> `useColors()`  [EXTRACTED]
  artifacts/travelmind-mobile/app/(tabs)/index.tsx → artifacts/travelmind-mobile/hooks/useColors.ts

## Communities (127 total, 30 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (38): AgentPage(), AgentPageProps, TripProvider(), useTrip(), feasibilityColors, dietColors, levelColors, severityColors (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (64): devDependencies, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, framer-motion, @hookform/resolvers (+56 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (61): devDependencies, chokidar, class-variance-authority, clsx, cmdk, date-fns, embla-carousel-react, fast-glob (+53 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): cn(), AccordionContent, AccordionItem, AccordionTrigger, Checkbox, HoverCardContent, Kbd(), KbdGroup() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (41): ButtonGroup(), ButtonGroupSeparator(), ButtonGroupText(), buttonGroupVariants, Field(), FieldContent(), FieldDescription(), FieldError() (+33 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (38): useIsMobile(), SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle (+30 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (46): devDependencies, @babel/core, babel-plugin-react-compiler, eas-cli, expo, expo-blur, @expo/cli, expo-constants (+38 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (38): Awaited, AwaitedInput, getHealthCheckQueryKey(), getHealthCheckQueryOptions(), getHealthCheckUrl(), healthCheck(), HealthCheckQueryError, HealthCheckQueryResult (+30 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): artifactDir, buildAll(), dependencies, cookie-parser, cors, drizzle-orm, express, http-proxy-middleware (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (24): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (17): AgentScreen(), BulletList(), Card(), CardHeader(), Pill(), Props, Row(), s (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (25): cache_clear_all(), cache_clear_prefix(), Entry point for a new trip session. Does not run any agent.     Delegates to Se, Weather agent workflow. Reads trip input from DB and stores weather., Run budget agent from trip context. Delegates to SessionOrchestrator., Disruption agent workflow. Delegates to SessionOrchestrator., Driving agent workflow. Delegates to SessionOrchestrator., Cuisine agent — reads trip + weather + budget from DB. (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, package, versionCode, reactCompiler, typedRoutes, expo (+20 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (28): cache_stats(), cache_or_fetch(), _cleanup_expired_sqlite(), clear_prefix(), delete_cache(), get_cache(), get_cache_stats(), _get_conn() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (14): ModuleMap, modules, logger, data, router, router, router, App() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (26): basePath, checkMetroHealth(), clearMetroCache(), downloadAssets(), downloadBundle(), downloadBundlesAndManifests(), downloadFile(), downloadManifest() (+18 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (15): links, Sidebar(), Button, ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination() (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (19): BudgetRequest, CuisineRequest, CultureRequest, DisruptionRequest, DrivingRequest, LanguageRequest, TripCreateRequest, BaseModel (+11 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (22): lifespan(), get_db(), init_db(), Create all tables and indexes on startup.     Safe to call multiple times — uses, Return an open aiosqlite connection with row_factory set., session_create(), startup(), create_trip() (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (22): compilerOptions, alwaysStrict, customConditions, isolatedModules, lib, module, moduleResolution, noEmitOnError (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (22): classify_budget_level(), fetch_dress_code_venues(), fetch_festivals_and_events(), fetch_food_markets(), fetch_language_tips(), fetch_local_customs(), _get_country_code(), map_price_level_to_cost() (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (19): _build_fallback(), get_budget_interest_questions(), _interest_to_activities(), Phase 1: Ask the user what they want to do     before generating any budget pla, Phase 2: Generate the full budget plan     using the user's interest answers., Converts raw user interest answers into     structured activity stubs for downs, run_budget_agent(), run_budget_workflow() (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (20): run_weather_agent(), calculate_mosquito_risk(), call_openweathermap(), fetch_daily_trip_forecast(), fetch_health_and_pollen_data(), fetch_health_outbreaks(), fetch_historical_precipitation(), fetch_historical_seismic_data() (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (17): TripContext, TripContextType, TripForm, ALLERGY_OPTIONS, BUDGET_TIERS, Chip(), CUISINE_PREFS, CURRENCIES (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (18): dependencies, drizzle-orm, drizzle-zod, pg, zod, devDependencies, drizzle-kit, @types/node (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (18): buildType, build, development, preview, production, cli, appVersionSource, version (+10 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (15): Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (16): Menubar, MenubarCheckboxItem, MenubarContent, MenubarGroup(), MenubarItem, MenubarLabel, MenubarMenu(), MenubarPortal() (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (17): BudgetService, ContextService, get_session_context(), get_trip_budget(), get_trip_data(), get_trip_weather(), get_trip_with_weather(), get_trip_with_weather_and_budget() (+9 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (11): appName, basePath, fs, http, landingPageTemplate, MIME_TYPES, path, port (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (10): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (9): NotFoundScreen(), styles, colors, AGENTS, DashboardHome(), s, DashboardLayout(), useColors() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (7): queryClient, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, ErrorFallback(), ErrorFallbackProps, styles

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, jsx, lib, moduleResolution, noEmit, paths, resolveJsonModule (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (10): create_session(), Session Orchestration Layer  Decouples session endpoints from direct agent/dat, Lazy-load weather data from database., Lazy-load budget data from database., run_cuisine_workflow(), run_culture_workflow(), run_disruption_workflow(), run_driving_workflow() (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.24
Nodes (10): _get_cuisine_knowledge(), run_cuisine_agent(), run_culture_agent(), _language_fallback(), run_language_agent(), run_language_workflow(), build_cache_key(), Builds a consistent cache key from prefix     and keyword arguments.      Exa (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, noEmit, paths, types (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.15
Nodes (12): devDependencies, prettier, typescript, license, name, private, scripts, build (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (12): classify_budget_level(), fetch_food_markets(), map_price_level_to_cost(), merge_restaurant_data(), Searches places using Geoapify Places API.     place_types:       catering.res, Fetches food markets and street food zones     using Geoapify., Classifies daily budget into price tier.     Used to filter restaurants appropr, Merges Foursquare and Geoapify results.     Deduplicates by name similarity. (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.30
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (11): dependencies, react-markdown, name, private, scripts, build, dev, serve (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.47
Nodes (10): fetchBudget(), fetchCuisine(), fetchCulture(), fetchDisruption(), fetchDriving(), fetchLanguage(), fetchWeather(), getBase() (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): devDependencies, tsx, @types/node, name, private, scripts, hello, typecheck (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.27
Nodes (9): run_driving_agent(), analyse_route_conditions(), calculate_driving_score(), classify_terrain(), fetch_elevation(), Gets elevation at a specific coordinate.     Used to detect mountain/hill roads, Analyses driving conditions for each     waypoint along the route., Classifies terrain type based on elevation. (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (9): dependencies, @tanstack/react-query, exports, name, peerDependencies, react, private, type (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, preview, typecheck, type (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.36
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 52 - "Community 52"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declarationMap, emitDeclarationOnly, lib, outDir, rootDir, extends (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declarationMap, emitDeclarationOnly, outDir, rootDir, types, extends (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, build, dev, serve, typecheck (+1 more)

### Community 55 - "Community 55"
Cohesion: 0.36
Nodes (8): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle

### Community 56 - "Community 56"
Cohesion: 0.27
Nodes (6): Avatar, AvatarFallback, AvatarImage, TabsContent, TabsList, TabsTrigger

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, declarationMap, emitDeclarationOnly, outDir, rootDir, extends, include

### Community 58 - "Community 58"
Cohesion: 0.39
Nodes (7): Drawer(), DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 59 - "Community 59"
Cohesion: 0.42
Nodes (7): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle()

### Community 60 - "Community 60"
Cohesion: 0.39
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 61 - "Community 61"
Cohesion: 0.36
Nodes (8): session_cuisine(), session_culture(), session_disruption(), session_driving(), session_get(), session_weather(), get_trip(), Return full parsed trip row, or None if not found.

### Community 62 - "Community 62"
Cohesion: 0.22
Nodes (8): compilerOptions, baseUrl, paths, strict, extends, include, @/*, references

### Community 63 - "Community 63"
Cohesion: 0.39
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 65 - "Community 65"
Cohesion: 0.25
Nodes (7): devDependencies, orval, name, private, scripts, codegen, version

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (7): dependencies, zod, exports, name, private, type, version

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (8): All trips for a user, newest first., session_list_user(), session_list_user(), list_user_trips(), _parse_trip_row(), All trips for a user, newest first., Convert a raw aiosqlite Row to a clean Python dict.     Deserialises all JSON co, get_user_trips()

### Community 68 - "Community 68"
Cohesion: 0.39
Nodes (7): _empty_response(), _knowledge_fallback(), Flatten Serper JSON response into a readable findings string     that looks sim, Performs a single web search via Serper API and returns a     flattened text st, run_disruption_agent(), _serper_snippets_to_text(), _single_search()

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, types, extends, include

### Community 70 - "Community 70"
Cohesion: 0.53
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 71 - "Community 71"
Cohesion: 0.53
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 72 - "Community 72"
Cohesion: 0.40
Nodes (3): apiClientReactSrc, apiZodSrc, root

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (3): DiscoveredComponent, mockupPreviewPlugin(), port

### Community 74 - "Community 74"
Cohesion: 0.40
Nodes (4): compileOnSave, extends, files, references

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (3): get_genai_client(), _load_env_once(), Best-effort env loader.      Some scripts/tests may import this module without g

## Knowledge Gaps
- **503 isolated node(s):** `name`, `version`, `license`, `preinstall`, `build` (+498 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 3` to `Community 0`, `Community 4`, `Community 5`, `Community 9`, `Community 16`, `Community 26`, `Community 28`, `Community 32`, `Community 36`, `Community 42`, `Community 45`, `Community 47`, `Community 51`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 60`, `Community 63`, `Community 70`, `Community 71`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 14` to `Community 0`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `useTrip()` connect `Community 0` to `Community 16`, `Community 33`, `Community 10`, `Community 23`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `name`, `version`, `license` to the rest of the system?**
  _611 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.055364314400458976 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._