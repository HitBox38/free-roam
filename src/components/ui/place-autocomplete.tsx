import { RiMapPinLine, RiSearchLine } from "@remixicon/react"
import * as React from "react"

import type { GeocodedPlace } from "@/lib/geocoding/geoapify"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"

type BBox = [number, number, number, number]

interface PlaceSearchResponse {
    places: Array<GeocodedPlace>
}

/**
 * Query parameters for the server-side Geoapify autocomplete proxy.
 * @see https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
 */
interface PlaceSearchOptions {
    /** Search text (address, place name, or POI) */
    query: string
    /** Preferred language for results (e.g., "en", "de", "fr") */
    lang?: string
    /** Maximum number of results to return */
    limit?: number
    /**
     * Bounding box used to restrict results.
     * Format: [minLongitude, minLatitude, maxLongitude, maxLatitude]
     */
    bbox?: BBox
    /** Latitude used to bias results toward a specific location */
    lat?: number
    /** Longitude used to bias results toward a specific location */
    lon?: number
}

interface PlaceAutocompleteProps
    extends Omit<PlaceSearchOptions, "query">,
    Omit<React.ComponentProps<"input">, "value" | "onChange"> {
    debounceMs?: number
    value?: string
    defaultValue?: string
    onChange?: (value: string) => void
    onPlaceSelect?: (place: GeocodedPlace) => void
    onResultsChange?: (results: Array<GeocodedPlace>) => void
}

function buildSearchUrl({
    query,
    bbox,
    lang,
    lat,
    limit,
    lon,
}: PlaceSearchOptions) {
    const url = new URL("/api/geocoding/search", window.location.origin)
    url.searchParams.set("text", query)

    if (lang) {
        url.searchParams.set("lang", lang)
    }

    if (limit) {
        url.searchParams.set("limit", String(limit))
    }

    if (bbox) {
        url.searchParams.set("filter", `rect:${bbox.join(",")}`)
    }

    if (lat !== undefined && lon !== undefined) {
        url.searchParams.set("bias", `proximity:${lon},${lat}`)
    }

    return String(url)
}

function useDebounce<T>(value: T, delay: number = 300) {
    const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

function usePlaceSearch({
    debounceMs,
    query,
    ...props
}: {
    debounceMs: number
} & PlaceSearchOptions) {
    const [results, setResults] = React.useState<Array<GeocodedPlace>>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<Error | null>(null)
    const [hasSearched, setHasSearched] = React.useState(false)

    const debouncedQuery = useDebounce(query, debounceMs)

    React.useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([])
            setIsLoading(false)
            setHasSearched(false)
            return
        }

        const abortController = new AbortController()

        async function fetchResults() {
            setIsLoading(true)
            setError(null)
            setHasSearched(true)

            try {
                const url = buildSearchUrl({ query: debouncedQuery, ...props })
                const response = await fetch(url, {
                    signal: abortController.signal,
                })

                if (!response.ok) {
                    throw new Error(
                        `Geoapify search error: ${response.status} ${response.statusText}`
                    )
                }

                const data: PlaceSearchResponse = await response.json()
                setResults(data.places)
            } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") {
                    setError(err)
                    setResults([])
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchResults()

        return () => abortController.abort()
    }, [
        debouncedQuery,
        props.lang,
        props.limit,
        props.bbox,
        props.lat,
        props.lon,
    ])

    return { results, isLoading, error, hasSearched }
}

function PlaceAutocomplete({
    debounceMs = 300,
    lang,
    limit = 5,
    bbox,
    lat,
    lon,
    className,
    value: controlledValue,
    defaultValue = "",
    onChange: controlledOnChange,
    onPlaceSelect,
    onResultsChange,
    ...props
}: PlaceAutocompleteProps) {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const [searchQuery, setSearchQuery] = React.useState("")

    const isControlled = controlledValue !== undefined
    const displayValue = isControlled ? controlledValue : internalValue

    const { results, isLoading, error, hasSearched } = usePlaceSearch({
        query: searchQuery,
        debounceMs,
        lang,
        limit,
        bbox,
        lat,
        lon,
    })

    React.useEffect(() => {
        onResultsChange?.(results)
    }, [results, onResultsChange])

    const hasNoResults =
        hasSearched && !isLoading && !error && results.length === 0
    const showCommandList = error || hasNoResults || results.length > 0

    return (
        <Command
            className={cn("h-fit overflow-visible", className)}
            shouldFilter={false}
            loop>
            <div className="relative">
                <InputGroup
                    className={cn(
                        "border-input! bg-popover! ring-0!",
                        showCommandList && "rounded-b-none"
                    )}>
                    <InputGroupAddon>
                        <RiSearchLine />
                    </InputGroupAddon>
                    <InputGroupInput
                        placeholder="Search"
                        value={displayValue}
                        onChange={(event) => {
                            const newValue = event.target.value
                            if (!isControlled) {
                                setInternalValue(newValue)
                            }
                            setSearchQuery(newValue)
                            controlledOnChange?.(newValue)
                        }}
                        {...props}
                    />
                    {isLoading && (
                        <InputGroupAddon align="inline-end">
                            <Spinner />
                        </InputGroupAddon>
                    )}
                </InputGroup>
                {showCommandList && (
                    <CommandList
                        data-state="open"
                        className={cn(
                            "bg-popover border-input absolute top-full right-0 left-0 rounded-b-md border border-t-0 shadow-md",
                            "data-[state=open]:animate-in data-[state=closed]:animate-out",
                            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                            "data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2"
                        )}>
                        {error && (
                            <CommandEmpty>Error: {error.message}</CommandEmpty>
                        )}
                        {hasNoResults && (
                            <CommandEmpty>
                                Can't find {displayValue}.
                            </CommandEmpty>
                        )}
                        {results.length > 0 && (
                            <CommandGroup>
                                {results.map((feature) => {
                                    return (
                                        <CommandItem
                                            key={feature.id}
                                            value={feature.id}
                                            onSelect={() => {
                                                if (!isControlled) {
                                                    setInternalValue(
                                                        feature.address
                                                    )
                                                }

                                                setSearchQuery("")
                                                controlledOnChange?.(
                                                    feature.address
                                                )
                                                onPlaceSelect?.(feature)
                                            }}>
                                            <RiMapPinLine />
                                            <div className="flex flex-col items-start text-start">
                                                <span className="font-medium">
                                                    {feature.name}
                                                </span>
                                                <span className="text-muted-foreground text-xs">
                                                    {feature.address}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        )}
                    </CommandList>
                )}
            </div>
        </Command>
    )
}

export { PlaceAutocomplete, type PlaceAutocompleteProps, type GeocodedPlace }
