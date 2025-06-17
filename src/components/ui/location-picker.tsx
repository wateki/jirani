import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Navigation, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  county?: string;
  postalCode?: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  currentLocation?: LocationData | null;
  className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  currentLocation,
  className = ""
}) => {
  const [gettingLocation, setGettingLocation] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Try to get address details using a free geocoding service
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            const locationData: LocationData = {
              latitude,
              longitude,
              address: data.locality || data.city || '',
              city: data.city || data.locality || '',
              county: data.principalSubdivision || '',
              postalCode: data.postcode || '',
            };
            
            onLocationSelect(locationData);
            
            toast({
              title: "Location detected",
              description: "Your current location has been detected successfully.",
            });
          } else {
            // Fallback: just use coordinates
            const locationData: LocationData = {
              latitude,
              longitude,
            };
            
            onLocationSelect(locationData);
            
            toast({
              title: "Location detected",
              description: "Location coordinates saved. Please fill in address details manually.",
            });
          }
        } catch (error) {
          console.error('Error getting address details:', error);
          // Still save the coordinates even if reverse geocoding fails
          const locationData: LocationData = {
            latitude,
            longitude,
          };
          
          onLocationSelect(locationData);
          
          toast({
            title: "Location detected",
            description: "Location coordinates saved. Please fill in address details manually.",
          });
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let message = "Could not get your location.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied. Please enable location services and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out.";
            break;
        }
        
        toast({
          title: "Location error",
          description: message,
          variant: "destructive",
        });
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  // Search for locations (using a simple geocoding service)
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ke&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        const results: LocationData[] = data.map((item: any) => ({
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          address: item.display_name,
          city: item.address?.city || item.address?.town || item.address?.village || '',
          county: item.address?.state || item.address?.county || '',
          postalCode: item.address?.postcode || '',
        }));
        
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      toast({
        title: "Search error",
        description: "Could not search for locations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium">Select Delivery Location</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setManualEntry(!manualEntry)}
        >
          {manualEntry ? 'Use Location Services' : 'Enter Manually'}
        </Button>
      </div>

      {!manualEntry ? (
        <div className="space-y-4">
          {/* Current Location Button */}
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="w-full"
          >
            {gettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            {gettingLocation ? 'Getting Your Location...' : 'Use My Current Location'}
          </Button>

          {/* Location Search */}
          <div className="space-y-2">
            <Label htmlFor="location-search">Or search for a location</Label>
            <div className="flex gap-2">
              <Input
                id="location-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Search for a place in Kenya..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={searchLocation}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      onLocationSelect(result);
                      setSearchResults([]);
                      setSearchQuery('');
                      toast({
                        title: "Location selected",
                        description: "Location has been set successfully.",
                      });
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{result.city || 'Unknown City'}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{result.address}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter coordinates manually if you know them:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manual-lat">Latitude</Label>
              <Input
                id="manual-lat"
                type="number"
                step="any"
                placeholder="-1.2921"
              />
            </div>
            <div>
              <Label htmlFor="manual-lng">Longitude</Label>
              <Input
                id="manual-lng"
                type="number"
                step="any"
                placeholder="36.8219"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const latInput = document.getElementById('manual-lat') as HTMLInputElement;
              const lngInput = document.getElementById('manual-lng') as HTMLInputElement;
              
              const lat = parseFloat(latInput.value);
              const lng = parseFloat(lngInput.value);
              
              if (isNaN(lat) || isNaN(lng)) {
                toast({
                  title: "Invalid coordinates",
                  description: "Please enter valid latitude and longitude values.",
                  variant: "destructive",
                });
                return;
              }
              
              onLocationSelect({
                latitude: lat,
                longitude: lng,
              });
              
              toast({
                title: "Location set",
                description: "Manual coordinates have been saved.",
              });
            }}
            className="w-full"
          >
            Set Manual Location
          </Button>
        </div>
      )}

      {/* Current Location Display */}
      {currentLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 text-green-600 mr-2" />
            <div className="flex-1">
              <span className="text-sm text-green-700 font-medium">
                Location saved
              </span>
              <p className="text-xs text-green-600">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              {currentLocation.address && (
                <p className="text-xs text-green-600 mt-1">
                  {currentLocation.address}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 