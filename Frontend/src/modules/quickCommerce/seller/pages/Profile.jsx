import { useEffect, useMemo, useRef, useState } from "react"
import {
  Building2,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Trash2,
  Save,
  ShieldCheck,
  Store,
  Upload,
} from "lucide-react"
import { sellerAPI, uploadAPI } from "@/services/api"
import { normalizeUrl } from "@food/utils/businessSettings"
import { loadGoogleMaps } from "@food/utils/googleMapsLoader"
import { getImageValidationError, getUploadErrorMessage } from "@/shared/utils/uploadErrors"
import { toast } from "sonner"

const businessTypes = [
  { value: "grocery", label: "Grocery" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "pet-store", label: "Pet Store" },
  { value: "meat-store", label: "Meat Store" },
  { value: "florist", label: "Florist" },
  { value: "general-store", label: "General Store" },
  { value: "other", label: "Other" },
]

const createEmptyForm = () => ({
  storeName: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  alternatePhone: "",
  businessType: "general-store",
  description: "",
  profileImage: "",
  coverImage: "",
  addressLine1: "",
  addressLine2: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  formattedAddress: "",
  latitude: "",
  longitude: "",
  panNumber: "",
  gstRegistered: false,
  gstNumber: "",
  fssaiNumber: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  documents: {
    panImage: "",
    gstImage: "",
    fssaiImage: "",
    storeImage: "",
    cancelledChequeImage: "",
  },
})

const createEmptyFiles = () => ({
  profileImage: null,
  coverImage: null,
  panImage: null,
  gstImage: null,
  fssaiImage: null,
  storeImage: null,
  cancelledChequeImage: null,
})

const getPayloadSeller = (response) =>
  response?.data?.data?.seller ||
  response?.data?.seller ||
  response?.data?.data ||
  response?.data ||
  null

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
const pincodeRegex = /^[1-9][0-9]{5}$/
const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
const phoneRegex = /^[0-9]{8,15}$/
const defaultMapCenter = { lat: 22.7196, lng: 75.8577 }

export default function SellerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState("")
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState("")
  const [mapFallbackMode, setMapFallbackMode] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [seller, setSeller] = useState(null)
  const [formData, setFormData] = useState(createEmptyForm())
  const [selectedFiles, setSelectedFiles] = useState(createEmptyFiles())
  const [previewUrls, setPreviewUrls] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const mapContainerRef = useRef(null)
  const addressSearchRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const autocompleteRef = useRef(null)
  const placesServiceRef = useRef(null)
  const googleMapsReadyRef = useRef(false)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      try {
        setLoading(true)
        const response = await sellerAPI.getProfile()
        const payload = getPayloadSeller(response)
        if (cancelled) return
        setSeller(payload)
        setFormData(mapSellerToForm(payload))
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Failed to load seller profile")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setMapFallbackMode(true)
      }
    }, 6000)

    const initMap = async () => {
      try {
        const google = await loadGoogleMaps({ libraries: ["places"] })
        if (cancelled || !mapContainerRef.current) return

        const lat = Number(formData.latitude)
        const lng = Number(formData.longitude)
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
        const center = hasCoords ? { lat, lng } : defaultMapCenter

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: hasCoords ? 16 : 11,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        })

        markerRef.current = new google.maps.Marker({
          position: center,
          map: mapRef.current,
          draggable: true,
        })

        placesServiceRef.current = new google.maps.places.PlacesService(mapRef.current)

        markerRef.current.addListener("dragend", (event) => {
          const nextLat = Number(event.latLng.lat().toFixed(6))
          const nextLng = Number(event.latLng.lng().toFixed(6))
          setFormData((prev) => ({
            ...prev,
            latitude: nextLat,
            longitude: nextLng,
          }))
          setFormErrors((prev) => ({ ...prev, latitude: "", longitude: "", location: "" }))
        })

        mapRef.current.addListener("click", (event) => {
          const nextLat = Number(event.latLng.lat().toFixed(6))
          const nextLng = Number(event.latLng.lng().toFixed(6))
          markerRef.current?.setPosition({ lat: nextLat, lng: nextLng })
          setFormData((prev) => ({
            ...prev,
            latitude: nextLat,
            longitude: nextLng,
          }))
          setFormErrors((prev) => ({ ...prev, latitude: "", longitude: "", location: "" }))
        })

        if (addressSearchRef.current) {
          autocompleteRef.current = new google.maps.places.Autocomplete(addressSearchRef.current, {
            fields: ["formatted_address", "address_components", "geometry"],
            componentRestrictions: { country: "in" },
          })

          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace?.()
            const geometry = place?.geometry?.location
            if (!geometry) return

            const nextLat = Number(geometry.lat().toFixed(6))
            const nextLng = Number(geometry.lng().toFixed(6))
            const components = Array.isArray(place?.address_components) ? place.address_components : []
            const getPart = (types) =>
              components.find((item) => types.some((type) => item.types?.includes(type)))?.long_name || ""

            setFormData((prev) => ({
              ...prev,
              formattedAddress: place?.formatted_address || prev.formattedAddress,
              area: getPart(["sublocality_level_1", "sublocality", "neighborhood"]) || prev.area,
              city: getPart(["locality", "administrative_area_level_2"]) || prev.city,
              state: getPart(["administrative_area_level_1"]) || prev.state,
              pincode: getPart(["postal_code"]) || prev.pincode,
              latitude: nextLat,
              longitude: nextLng,
            }))

            mapRef.current?.panTo({ lat: nextLat, lng: nextLng })
            mapRef.current?.setZoom(16)
            markerRef.current?.setPosition({ lat: nextLat, lng: nextLng })
            setFormErrors((prev) => ({ ...prev, latitude: "", longitude: "", location: "" }))
          })
        }

        setMapsReady(true)
        setMapFallbackMode(false)
        googleMapsReadyRef.current = true
        setMapError("")
      } catch (error) {
        if (cancelled) return
        setMapsReady(false)
        setMapFallbackMode(true)
        googleMapsReadyRef.current = false
        setMapError(error?.message || "Unable to load Google Maps")
      }
    }

    initMap()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const lat = Number(formData.latitude)
    const lng = Number(formData.longitude)
    if (!mapRef.current || !markerRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return

    const nextPosition = { lat, lng }
    markerRef.current.setPosition(nextPosition)
    mapRef.current.panTo(nextPosition)
  }, [formData.latitude, formData.longitude])

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    const query = String(formData.formattedAddress || "").trim()
    if (query.length < 3) {
      setLocationSuggestions([])
      setIsSearchingLocation(false)
      return
    }

    const timer = setTimeout(() => {
      if (!googleMapsReadyRef.current || !window.google?.maps?.places?.AutocompleteService) {
        setLocationSuggestions([])
        setIsSearchingLocation(false)
        return
      }

      setIsSearchingLocation(true)
      try {
        const service = new window.google.maps.places.AutocompleteService()
        service.getPlacePredictions(
          { input: query, componentRestrictions: { country: "in" } },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              setLocationSuggestions(
                predictions.map((item) => ({
                  id: item.place_id,
                  display: item.description,
                }))
              )
            } else {
              setLocationSuggestions([])
            }
            setIsSearchingLocation(false)
          }
        )
      } catch (_) {
        setLocationSuggestions([])
        setIsSearchingLocation(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [formData.formattedAddress])

  const handleLocationSuggestionSelect = (suggestion) => {
    if (!suggestion?.id || !placesServiceRef.current || !window.google?.maps?.places) {
      justSelectedRef.current = true
      handleFieldChange("formattedAddress", suggestion?.display || "")
      setLocationSuggestions([])
      return
    }

    setIsSearchingLocation(true)
    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.id,
        fields: ["formatted_address", "address_components", "geometry"],
      },
      (place, status) => {
        setIsSearchingLocation(false)
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          justSelectedRef.current = true
          handleFieldChange("formattedAddress", suggestion.display || "")
          setLocationSuggestions([])
          return
        }

        const geometry = place.geometry.location
        const nextLat = Number(geometry.lat().toFixed(6))
        const nextLng = Number(geometry.lng().toFixed(6))
        const components = Array.isArray(place.address_components) ? place.address_components : []
        const getPart = (types) =>
          components.find((item) => types.some((type) => item.types?.includes(type)))?.long_name || ""

        justSelectedRef.current = true
        setFormData((prev) => ({
          ...prev,
          formattedAddress: place.formatted_address || suggestion.display || prev.formattedAddress,
          addressLine1: place.formatted_address || prev.addressLine1 || "",
          area: getPart(["sublocality_level_1", "sublocality", "neighborhood"]) || prev.area,
          city: getPart(["locality", "administrative_area_level_2"]) || prev.city,
          state: getPart(["administrative_area_level_1"]) || prev.state,
          pincode: getPart(["postal_code"]) || prev.pincode,
          latitude: nextLat,
          longitude: nextLng,
        }))
        setLocationSuggestions([])
        setFormErrors((prev) => ({ ...prev, latitude: "", longitude: "", location: "" }))
        mapRef.current?.panTo({ lat: nextLat, lng: nextLng })
        mapRef.current?.setZoom(16)
        markerRef.current?.setPosition({ lat: nextLat, lng: nextLng })
      }
    )
  }

  const completion = useMemo(() => {
    const fields = [
      formData.storeName,
      formData.ownerName,
      formData.ownerEmail,
      formData.ownerPhone,
      formData.city,
      formData.state,
      formData.pincode,
      formData.panNumber,
      formData.accountHolderName,
      formData.accountNumber,
      formData.ifscCode,
      formData.profileImage || previewUrls.profileImage,
      formData.documents.panImage || previewUrls.panImage,
      formData.documents.storeImage || previewUrls.storeImage,
    ]
    const filled = fields.filter((value) => String(value || "").trim()).length
    return Math.round((filled / fields.length) * 100)
  }, [formData, previewUrls])

  const embeddedMapUrl = useMemo(() => {
    const lat = Number(formData.latitude)
    const lng = Number(formData.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    }

    const addressQuery = String(formData.formattedAddress || formData.addressLine1 || formData.city || "").trim()
    if (addressQuery) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&z=14&output=embed`
    }

    return `https://maps.google.com/maps?q=${defaultMapCenter.lat},${defaultMapCenter.lng}&z=11&output=embed`
  }, [formData.latitude, formData.longitude, formData.formattedAddress, formData.addressLine1, formData.city])

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => ({ ...prev, [field]: "", location: field === "latitude" || field === "longitude" ? "" : prev.location }))
  }

  const handleFileSelect = (key, file) => {
    if (!file) return

    const validationError = getImageValidationError(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedFiles((prev) => ({ ...prev, [key]: file }))
    setPreviewUrls((prev) => ({ ...prev, [key]: objectUrl }))
    setFormErrors((prev) => ({ ...prev, [key]: "" }))
  }

  const clearMediaField = (key) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: null }))
    setPreviewUrls((prev) => ({ ...prev, [key]: "" }))

    if (key === "profileImage" || key === "coverImage") {
      setFormData((prev) => ({ ...prev, [key]: "" }))
    } else {
      setFormData((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [key]: "",
        },
      }))
    }
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.storeName.trim()) nextErrors.storeName = "Store name is required"
    if (!formData.ownerName.trim()) nextErrors.ownerName = "Owner name is required"

    if (formData.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail.trim())) {
      nextErrors.ownerEmail = "Enter a valid email address"
    }

    if (formData.alternatePhone && !phoneRegex.test(formData.alternatePhone.trim())) {
      nextErrors.alternatePhone = "Alternate phone must be 8 to 15 digits"
    }

    if (formData.pincode && !pincodeRegex.test(formData.pincode.trim())) {
      nextErrors.pincode = "Pincode must be 6 digits"
    }

    if (formData.panNumber && !panRegex.test(formData.panNumber.trim().toUpperCase())) {
      nextErrors.panNumber = "PAN format should be like ABCDE1234F"
    }

    if (formData.gstRegistered) {
      if (!formData.gstNumber.trim()) {
        nextErrors.gstNumber = "GST number is required when GST is enabled"
      } else if (!gstRegex.test(formData.gstNumber.trim().toUpperCase())) {
        nextErrors.gstNumber = "GST format is invalid"
      }
    }

    if (formData.ifscCode && !ifscRegex.test(formData.ifscCode.trim().toUpperCase())) {
      nextErrors.ifscCode = "IFSC format should be like HDFC0123456"
    }

    if (formData.upiId && !upiRegex.test(formData.upiId.trim())) {
      nextErrors.upiId = "Enter a valid UPI ID"
    }

    const hasLatitude = String(formData.latitude).trim() !== ""
    const hasLongitude = String(formData.longitude).trim() !== ""
    if (hasLatitude !== hasLongitude) {
      nextErrors.location = "Latitude and longitude must both be filled"
    }

    if (hasLatitude && hasLongitude) {
      const lat = Number(formData.latitude)
      const lng = Number(formData.longitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        nextErrors.latitude = "Latitude must be between -90 and 90"
      }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        nextErrors.longitude = "Longitude must be between -180 and 180"
      }
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const uploadFileIfNeeded = async (key, folder) => {
    const file = selectedFiles[key]
    if (!file) {
      if (key === "profileImage" || key === "coverImage") {
        return formData[key]
      }
      return formData.documents[key]
    }

    try {
      setUploadingKey(key)
      const uploadResponse = await uploadAPI.uploadMedia(file, { folder })
      const uploadedUrl = uploadResponse?.data?.data?.url || uploadResponse?.data?.url
      if (!uploadedUrl) {
        throw new Error("Failed to get uploaded file URL")
      }
      return uploadedUrl
    } catch (error) {
      throw new Error(getUploadErrorMessage(error, { fallback: `Failed to upload ${key}` }))
    } finally {
      setUploadingKey("")
    }
  }

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        toast.error("Please fix the highlighted fields")
        return
      }

      setSaving(true)

      const [
        profileImage,
        coverImage,
        panImage,
        gstImage,
        fssaiImage,
        storeImage,
        cancelledChequeImage,
      ] = await Promise.all([
        uploadFileIfNeeded("profileImage", "bitecube/quick-commerce/seller/profile"),
        uploadFileIfNeeded("coverImage", "bitecube/quick-commerce/seller/cover"),
        uploadFileIfNeeded("panImage", "bitecube/quick-commerce/seller/documents"),
        uploadFileIfNeeded("gstImage", "bitecube/quick-commerce/seller/documents"),
        uploadFileIfNeeded("fssaiImage", "bitecube/quick-commerce/seller/documents"),
        uploadFileIfNeeded("storeImage", "bitecube/quick-commerce/seller/documents"),
        uploadFileIfNeeded("cancelledChequeImage", "bitecube/quick-commerce/seller/documents"),
      ])

      const payload = {
        storeName: formData.storeName.trim(),
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.ownerEmail.trim(),
        alternatePhone: formData.alternatePhone.trim(),
        businessType: formData.businessType,
        description: formData.description.trim(),
        profileImage: profileImage || "",
        coverImage: coverImage || "",
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        landmark: formData.landmark.trim(),
        formattedAddress: formData.formattedAddress.trim(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        gstRegistered: Boolean(formData.gstRegistered),
        gstNumber: formData.gstNumber.trim().toUpperCase(),
        fssaiNumber: formData.fssaiNumber.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        upiId: formData.upiId.trim(),
        documents: {
          panImage: panImage || "",
          gstImage: gstImage || "",
          fssaiImage: fssaiImage || "",
          storeImage: storeImage || "",
          cancelledChequeImage: cancelledChequeImage || "",
        },
      }

      if (String(formData.latitude).trim() !== "") payload.latitude = Number(formData.latitude)
      if (String(formData.longitude).trim() !== "") payload.longitude = Number(formData.longitude)

      const response = await sellerAPI.updateProfile(payload)
      const updatedSeller = getPayloadSeller(response)
      setSeller(updatedSeller)
      setFormData(mapSellerToForm(updatedSeller))
      setSelectedFiles(createEmptyFiles())
      setPreviewUrls({})
      setFormErrors({})
      toast.success("Seller profile updated successfully")
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to update seller profile")
    } finally {
      setSaving(false)
      setUploadingKey("")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Loading seller profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/60">Seller Profile</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight font-['Outfit']">
              {formData.storeName || "Seller Profile"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80">
              Complete and update your business profile, address, tax details, bank details, and seller documents from one place.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat label="Status" value={String(seller?.status || "pending").replace(/^\w/, (char) => char.toUpperCase())} />
            <HeroStat label="Completion" value={`${completion}%`} />
            <HeroStat label="Phone" value={formData.ownerPhone || "N/A"} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ProfileCard
          icon={Store}
          title="Business Details"
          description="Basic seller identity and storefront information."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Store Name" value={formData.storeName} onChange={(value) => handleFieldChange("storeName", value)} error={formErrors.storeName} />
            <InputField label="Owner Name" value={formData.ownerName} onChange={(value) => handleFieldChange("ownerName", value)} error={formErrors.ownerName} />
            <InputField label="Owner Email" type="email" value={formData.ownerEmail} onChange={(value) => handleFieldChange("ownerEmail", value)} error={formErrors.ownerEmail} />
            <InputField label="Primary Phone" value={formData.ownerPhone} onChange={() => {}} disabled helper="Primary phone is read-only in seller profile." />
            <InputField label="Alternate Phone" value={formData.alternatePhone} onChange={(value) => handleFieldChange("alternatePhone", value)} error={formErrors.alternatePhone} />
            <SelectField label="Business Type" value={formData.businessType} onChange={(value) => handleFieldChange("businessType", value)} options={businessTypes} />
            <div className="md:col-span-2">
              <TextAreaField label="Description" value={formData.description} onChange={(value) => handleFieldChange("description", value)} rows={4} />
            </div>
          </div>
        </ProfileCard>

        <ProfileCard
          icon={ImageIcon}
          title="Brand Images"
          description="Upload storefront profile and cover images."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <UploadImageCard
              label="Profile Image"
              imageUrl={previewUrls.profileImage || normalizeUrl(formData.profileImage)}
              onFileSelect={(file) => handleFileSelect("profileImage", file)}
              onClear={() => clearMediaField("profileImage")}
              hasValue={Boolean(previewUrls.profileImage || formData.profileImage)}
              uploading={uploadingKey === "profileImage"}
            />
            <UploadImageCard
              label="Cover Image"
              imageUrl={previewUrls.coverImage || normalizeUrl(formData.coverImage)}
              onFileSelect={(file) => handleFileSelect("coverImage", file)}
              onClear={() => clearMediaField("coverImage")}
              hasValue={Boolean(previewUrls.coverImage || formData.coverImage)}
              uploading={uploadingKey === "coverImage"}
            />
          </div>
        </ProfileCard>
      </div>

      <ProfileCard
        icon={MapPin}
        title="Address Details"
        description="Business address, map coordinates, and service location details."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <div className="relative">
              <InputField
                label="Search Location"
                value={formData.formattedAddress}
                onChange={(value) => handleFieldChange("formattedAddress", value)}
                inputRef={addressSearchRef}
                helper="Search your shop location, then select the correct address from suggestions."
              />
              {isSearchingLocation ? (
                <div className="absolute right-4 top-[42px] text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : null}
              {locationSuggestions.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                  {locationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => handleLocationSuggestionSelect(suggestion)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-700">{suggestion.display}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <InputField label="Address Line 1" value={formData.addressLine1} onChange={(value) => handleFieldChange("addressLine1", value)} error={formErrors.addressLine1} />
          <InputField label="Address Line 2" value={formData.addressLine2} onChange={(value) => handleFieldChange("addressLine2", value)} />
          <InputField label="Landmark" value={formData.landmark} onChange={(value) => handleFieldChange("landmark", value)} helper="Nearby landmark (optional)" />
          <InputField label="Area" value={formData.area} onChange={(value) => handleFieldChange("area", value)} />
          <InputField label="City" value={formData.city} onChange={(value) => handleFieldChange("city", value)} />
          <InputField label="State" value={formData.state} onChange={(value) => handleFieldChange("state", value)} />
          <InputField label="Pincode" value={formData.pincode} onChange={(value) => handleFieldChange("pincode", value)} error={formErrors.pincode} />
          <InputField label="Latitude" type="number" value={formData.latitude} onChange={(value) => handleFieldChange("latitude", value)} error={formErrors.latitude} />
          <InputField label="Longitude" type="number" value={formData.longitude} onChange={(value) => handleFieldChange("longitude", value)} error={formErrors.longitude} />
          <div className="md:col-span-2 xl:col-span-3">
            <TextAreaField
              label="Pinned Address Preview"
              value={formData.formattedAddress}
              onChange={(value) => handleFieldChange("formattedAddress", value)}
              rows={2}
              helper="This is the address currently linked to the selected map pin."
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {formErrors.location ? <span className="text-xs font-medium text-red-500">{formErrors.location}</span> : null}
            </div>
            <p className="text-xs text-slate-500">Use search, map click, or drag the pin to set the seller location.</p>
          </div>
          <div className="md:col-span-2 xl:col-span-3 rounded-[1.5rem] border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Map Picker</p>
                <p className="text-xs text-slate-500">Click on the map or drag the marker to set your seller location.</p>
              </div>
              {!mapsReady && !mapError ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
            </div>
            {mapFallbackMode || mapError ? (
              <div className="space-y-3">
                {mapError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {mapError}. Showing fallback map for the selected seller location.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Interactive map is taking longer than expected. Showing fallback map for the selected seller location.
                  </div>
                )}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <iframe
                    title="Seller location map"
                    src={embeddedMapUrl}
                    className="h-[320px] w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            ) : (
              <div ref={mapContainerRef} className="h-[320px] w-full rounded-2xl border border-slate-200 bg-slate-100" />
            )}
          </div>
        </div>
      </ProfileCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard
          icon={ShieldCheck}
          title="Tax & Compliance"
          description="Update PAN, GST, and FSSAI information."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="PAN Number" value={formData.panNumber} onChange={(value) => handleFieldChange("panNumber", value.toUpperCase())} error={formErrors.panNumber} />
            <InputField label="FSSAI Number" value={formData.fssaiNumber} onChange={(value) => handleFieldChange("fssaiNumber", value)} />
            <ToggleField label="GST Registered" checked={formData.gstRegistered} onChange={(checked) => handleFieldChange("gstRegistered", checked)} />
            <InputField label="GST Number" value={formData.gstNumber} onChange={(value) => handleFieldChange("gstNumber", value.toUpperCase())} disabled={!formData.gstRegistered} error={formErrors.gstNumber} />
          </div>
        </ProfileCard>

        <ProfileCard
          icon={CreditCard}
          title="Bank & Payout Details"
          description="Update bank account and UPI payout information."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Account Holder Name" value={formData.accountHolderName} onChange={(value) => handleFieldChange("accountHolderName", value)} />
            <InputField label="Account Number" value={formData.accountNumber} onChange={(value) => handleFieldChange("accountNumber", value)} />
            <InputField label="IFSC Code" value={formData.ifscCode} onChange={(value) => handleFieldChange("ifscCode", value.toUpperCase())} error={formErrors.ifscCode} />
            <InputField label="UPI ID" value={formData.upiId} onChange={(value) => handleFieldChange("upiId", value)} error={formErrors.upiId} />
          </div>
        </ProfileCard>
      </div>

      <ProfileCard
        icon={FileText}
        title="Seller Documents"
        description="Upload and replace compliance documents and store verification images."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <DocumentUploadCard
            label="PAN Document"
            currentUrl={previewUrls.panImage || normalizeUrl(formData.documents.panImage)}
            onFileSelect={(file) => handleFileSelect("panImage", file)}
            onClear={() => clearMediaField("panImage")}
            hasValue={Boolean(previewUrls.panImage || formData.documents.panImage)}
            uploading={uploadingKey === "panImage"}
          />
          <DocumentUploadCard
            label="GST Document"
            currentUrl={previewUrls.gstImage || normalizeUrl(formData.documents.gstImage)}
            onFileSelect={(file) => handleFileSelect("gstImage", file)}
            onClear={() => clearMediaField("gstImage")}
            hasValue={Boolean(previewUrls.gstImage || formData.documents.gstImage)}
            uploading={uploadingKey === "gstImage"}
          />
          <DocumentUploadCard
            label="FSSAI Document"
            currentUrl={previewUrls.fssaiImage || normalizeUrl(formData.documents.fssaiImage)}
            onFileSelect={(file) => handleFileSelect("fssaiImage", file)}
            onClear={() => clearMediaField("fssaiImage")}
            hasValue={Boolean(previewUrls.fssaiImage || formData.documents.fssaiImage)}
            uploading={uploadingKey === "fssaiImage"}
          />
          <DocumentUploadCard
            label="Store Image"
            currentUrl={previewUrls.storeImage || normalizeUrl(formData.documents.storeImage)}
            onFileSelect={(file) => handleFileSelect("storeImage", file)}
            onClear={() => clearMediaField("storeImage")}
            hasValue={Boolean(previewUrls.storeImage || formData.documents.storeImage)}
            uploading={uploadingKey === "storeImage"}
          />
          <DocumentUploadCard
            label="Cancelled Cheque"
            currentUrl={previewUrls.cancelledChequeImage || normalizeUrl(formData.documents.cancelledChequeImage)}
            onFileSelect={(file) => handleFileSelect("cancelledChequeImage", file)}
            onClear={() => clearMediaField("cancelledChequeImage")}
            hasValue={Boolean(previewUrls.cancelledChequeImage || formData.documents.cancelledChequeImage)}
            uploading={uploadingKey === "cancelledChequeImage"}
          />
        </div>
      </ProfileCard>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving Profile..." : "Save Profile"}
        </button>
      </div>
    </div>
  )
}

function mapSellerToForm(seller = {}) {
  return {
    ...createEmptyForm(),
    storeName: seller.storeName || "",
    ownerName: seller.ownerName || "",
    ownerEmail: seller.ownerEmail || "",
    ownerPhone: seller.ownerPhone || "",
    alternatePhone: seller.alternatePhone || "",
    businessType: seller.businessType || "general-store",
    description: seller.description || "",
    profileImage: seller.profileImage || "",
    coverImage: seller.coverImage || "",
    addressLine1: seller.addressLine1 || "",
    addressLine2: seller.addressLine2 || "",
    area: seller.area || "",
    city: seller.city || "",
    state: seller.state || "",
    pincode: seller.pincode || "",
    landmark: seller.landmark || "",
    formattedAddress: seller.location?.formattedAddress || seller.formattedAddress || "",
    latitude: seller.location?.latitude ?? "",
    longitude: seller.location?.longitude ?? "",
    panNumber: seller.panNumber || "",
    gstRegistered: Boolean(seller.gstRegistered),
    gstNumber: seller.gstNumber || "",
    fssaiNumber: seller.fssaiNumber || "",
    accountHolderName: seller.accountHolderName || "",
    accountNumber: seller.accountNumber || "",
    ifscCode: seller.ifscCode || "",
    upiId: seller.upiId || "",
    documents: {
      panImage: seller.documents?.panImage || "",
      gstImage: seller.documents?.gstImage || "",
      fssaiImage: seller.documents?.fssaiImage || "",
      storeImage: seller.documents?.storeImage || "",
      cancelledChequeImage: seller.documents?.cancelledChequeImage || "",
    },
  }
}

function ProfileCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 font-['Outfit']">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-black text-white font-['Outfit']">{value}</p>
    </div>
  )
}

function InputField({ label, helper, error, disabled = false, inputRef, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        ref={inputRef}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500 ${
          error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-slate-400 focus:ring-slate-200"
        }`}
      />
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  )
}

function TextAreaField({ label, helper, inputRef, onChange, rows = 3, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        {...props}
        ref={inputRef}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ToggleField({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">Enable if this seller has active GST registration.</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked ? "bg-slate-900" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}

function UploadImageCard({ label, imageUrl, onFileSelect, onClear, hasValue, uploading }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hasValue ? (
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 items-center justify-center bg-slate-100 text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload Image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileSelect(event.target.files?.[0])}
        />
      </label>
    </div>
  )
}

function DocumentUploadCard({ label, currentUrl, onFileSelect, onClear, hasValue, uploading }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <div className="flex items-center gap-3">
          {currentUrl ? (
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View
            </a>
          ) : null}
          {hasValue ? (
            <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="h-full w-full rounded-2xl object-cover" />
        ) : (
          <FileText className="h-8 w-8" />
        )}
      </div>
      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload Document
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileSelect(event.target.files?.[0])}
        />
      </label>
    </div>
  )
}
