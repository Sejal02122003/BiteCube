import { useState, useMemo, useEffect } from "react"
import {
  Search, Plus, Edit, Trash2, ArrowUpDown,
  Percent, Loader2, Building2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@food/components/ui/dialog"
import { adminAPI } from "@food/api"
import { toast } from "sonner"

export default function SellerCommission() {
  const [searchQuery, setSearchQuery] = useState("")
  const [commissions, setCommissions] = useState([])
  const [approvedSellers, setApprovedSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    globalSellerCommission: 0,
    globalGstOnItem: 0,
    globalGstOnCommission: 18,
    globalPaymentGatewayFee: 2,
    globalTcs: 1,
    applyGlobalTaxes: true,
  })
  const [isSellerSelectOpen, setIsSellerSelectOpen] = useState(false)
  const [selectedCommission, setSelectedCommission] = useState(null)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [formData, setFormData] = useState({
    sellerId: "",
    defaultCommission: {
      type: "percentage",
      value: "10",
    },
    notes: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [visibleColumns] = useState({
    si: true,
    seller: true,
    sellerId: true,
    defaultCommission: true,
    status: true,
    actions: true,
  })

  const combinedList = useMemo(() => {
    return approvedSellers.map((seller, index) => {
      const commission = commissions.find((entry) =>
        String(entry.sellerId) === String(seller._id) ||
        (entry.seller && String(entry.seller._id) === String(seller._id))
      )

      return {
        _id: seller._id,
        sl: index + 1,
        sellerName: seller.storeName,
        sellerCode: seller.sellerId,
        hasCustomCommission: !!commission,
        commissionData: commission || null,
        defaultCommission: commission ? commission.defaultCommission : {
          type: "percentage",
          value: globalSettings.globalSellerCommission,
        },
        status: commission ? commission.status : true,
      }
    })
  }, [approvedSellers, commissions, globalSettings.globalSellerCommission])

  const filteredCommissions = useMemo(() => {
    if (!searchQuery.trim()) return combinedList

    const query = searchQuery.toLowerCase().trim()
    return combinedList.filter((item) =>
      item.sellerName?.toLowerCase().includes(query) ||
      item.sellerCode?.toLowerCase().includes(query)
    )
  }, [combinedList, searchQuery])

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return approvedSellers

    const query = searchQuery.toLowerCase().trim()
    return approvedSellers.filter((seller) =>
      seller.storeName?.toLowerCase().includes(query) ||
      seller.sellerId?.toLowerCase().includes(query) ||
      seller.ownerName?.toLowerCase().includes(query)
    )
  }, [approvedSellers, searchQuery])

  useEffect(() => {
    fetchBootstrap()
  }, [])

  const fetchBootstrap = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getQCSellerCommissionBootstrap()
      const data = response?.data?.data
      setCommissions(Array.isArray(data?.commissions) ? data.commissions : [])
      setApprovedSellers(Array.isArray(data?.sellers) ? data.sellers : [])
      if (data?.globalSettings) {
        setGlobalSettings({
          globalSellerCommission: data.globalSettings.globalSellerCommission || 0,
          globalGstOnItem: data.globalSettings.globalGstOnItem || 0,
          globalGstOnCommission: data.globalSettings.globalGstOnCommission || 0,
          globalPaymentGatewayFee: data.globalSettings.globalPaymentGatewayFee || 0,
          globalTcs: data.globalSettings.globalTcs || 0,
          applyGlobalTaxes: data.globalSettings.applyGlobalTaxes !== false,
        })
      }
    } catch (error) {
      setCommissions([])
      setApprovedSellers([])
      toast.error(error?.response?.data?.message || "Failed to fetch seller commissions")
    } finally {
      setLoading(false)
    }
  }

  const fetchCommissions = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getQCSellerCommissions({})
      const commissionsData =
        response?.data?.data?.commissions ||
        response?.data?.commissions ||
        []
      setCommissions(Array.isArray(commissionsData) ? commissionsData : [])
    } catch (error) {
      setCommissions([])
      toast.error(error?.response?.data?.message || "Failed to fetch seller commissions")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (item) => {
    if (!item.hasCustomCommission || !item.commissionData) {
      toast.info("Cannot toggle status of global commission. Add a custom commission first.")
      return
    }

    try {
      await adminAPI.toggleQCSellerCommissionStatus(item.commissionData._id)
      await fetchCommissions()
      toast.success("Commission status updated successfully")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status")
    }
  }

  const handleSaveGlobal = async () => {
    try {
      setSavingGlobal(true)
      await adminAPI.updateGlobalQCSellerCommissionSettings({
        globalSellerCommission: Number(globalSettings.globalSellerCommission),
        globalGstOnItem: Number(globalSettings.globalGstOnItem),
        globalGstOnCommission: Number(globalSettings.globalGstOnCommission),
        globalPaymentGatewayFee: Number(globalSettings.globalPaymentGatewayFee),
        globalTcs: Number(globalSettings.globalTcs),
        applyGlobalTaxes: Boolean(globalSettings.applyGlobalTaxes),
      })
      toast.success("Global settings updated successfully")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update global settings")
    } finally {
      setSavingGlobal(false)
    }
  }

  const handleAdd = () => {
    setSelectedCommission(null)
    setSelectedSeller(null)
    setFormData({
      sellerId: "",
      defaultCommission: {
        type: "percentage",
        value: "10",
      },
      notes: "",
    })
    setFormErrors({})
    setIsSellerSelectOpen(true)
  }

  const handleSelectSeller = (seller) => {
    setSelectedSeller(seller)
    setFormData((prev) => ({
      ...prev,
      sellerId: seller._id,
    }))
    setIsSellerSelectOpen(false)
    setIsAddEditOpen(true)
  }

  const handleEdit = async (commission) => {
    try {
      setLoading(true)
      const response = await adminAPI.getQCSellerCommissionById(commission._id)
      const commissionData =
        response?.data?.data?.commission ||
        response?.data?.commission ||
        null

      if (commissionData) {
        setSelectedCommission(commissionData)
        setSelectedSeller(commissionData.seller)

        let sellerId = ""
        if (commissionData.seller) {
          if (typeof commissionData.seller === "object" && commissionData.seller._id) {
            sellerId = commissionData.seller._id
          } else if (typeof commissionData.seller === "string") {
            sellerId = commissionData.seller
          } else {
            sellerId = commissionData.sellerId || commissionData.seller?._id || ""
          }
        } else {
          sellerId = commissionData.sellerId || ""
        }

        setFormData({
          sellerId,
          defaultCommission: {
            type: commissionData.defaultCommission?.type || "percentage",
            value: commissionData.defaultCommission?.value?.toString() || "10",
          },
          notes: commissionData.notes || "",
        })
        setFormErrors({})
        setIsAddEditOpen(true)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load commission")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (commission) => {
    setSelectedCommission(commission)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedCommission) return

    try {
      setDeleting(true)
      await adminAPI.deleteQCSellerCommission(selectedCommission._id)
      await fetchCommissions()
      toast.success("Commission deleted successfully")
      setIsDeleteOpen(false)
      setSelectedCommission(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete commission")
    } finally {
      setDeleting(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.sellerId) {
      errors.sellerId = "Seller is required"
    }

    if (!formData.defaultCommission.value || parseFloat(formData.defaultCommission.value) < 0) {
      errors.defaultCommission = "Default commission value is required"
    }

    if (
      formData.defaultCommission.type === "percentage" &&
      (parseFloat(formData.defaultCommission.value) < 0 || parseFloat(formData.defaultCommission.value) > 100)
    ) {
      errors.defaultCommission = "Percentage must be between 0-100"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    try {
      setSaving(true)

      const payload = {
        sellerId: formData.sellerId,
        defaultCommission: {
          type: formData.defaultCommission.type,
          value: parseFloat(formData.defaultCommission.value),
        },
        notes: formData.notes,
      }

      if (selectedCommission) {
        await adminAPI.updateQCSellerCommission(selectedCommission._id, payload)
        toast.success("Commission updated successfully")
      } else {
        await adminAPI.createQCSellerCommission(payload)
        toast.success("Commission created successfully")
      }

      await fetchCommissions()
      setIsAddEditOpen(false)
      setSelectedCommission(null)
      setSelectedSeller(null)
      await fetchBootstrap()
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save commission")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Seller Commission</h1>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700">
                {filteredCommissions.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Commission
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Percent className="w-4 h-4 text-blue-600" />
                Global Settings (Applied to all sellers)
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Apply Taxes</span>
                <button
                  onClick={() => setGlobalSettings({ ...globalSettings, applyGlobalTaxes: !globalSettings.applyGlobalTaxes })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    globalSettings.applyGlobalTaxes ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      globalSettings.applyGlobalTaxes ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity ${!globalSettings.applyGlobalTaxes ? "opacity-50 pointer-events-none" : ""}`}>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Global Default Commission (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={globalSettings.globalSellerCommission}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, globalSellerCommission: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">GST on Item (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={globalSettings.globalGstOnItem}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, globalGstOnItem: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">GST on Commission (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={globalSettings.globalGstOnCommission}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, globalGstOnCommission: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Gateway Fee (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={globalSettings.globalPaymentGatewayFee}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, globalPaymentGatewayFee: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">TCS (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={globalSettings.globalTcs}
                    onChange={(e) => setGlobalSettings({ ...globalSettings, globalTcs: e.target.value })}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveGlobal}
                disabled={savingGlobal}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingGlobal && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Global Settings
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 sm:flex-initial min-w-[250px]">
              <input
                type="text"
                placeholder="Ex: Search by seller name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {visibleColumns.si && (
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <span>S.No</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                        </div>
                      </th>
                    )}
                    {visibleColumns.seller && (
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Seller Name
                      </th>
                    )}
                    {visibleColumns.sellerId && (
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Seller ID
                      </th>
                    )}
                    {visibleColumns.defaultCommission && (
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Default Commission
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredCommissions.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter((value) => value).length} className="px-6 py-8 text-center text-slate-500">
                        No commissions found
                      </td>
                    </tr>
                  ) : (
                    filteredCommissions.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        {visibleColumns.si && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-700">{item.sl || "-"}</span>
                          </td>
                        )}
                        {visibleColumns.seller && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              {item.sellerName || "-"}
                            </span>
                          </td>
                        )}
                        {visibleColumns.sellerId && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-700">{item.sellerCode || "-"}</span>
                          </td>
                        )}
                        {visibleColumns.defaultCommission && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">
                                {item.defaultCommission?.type === "percentage" ? (
                                  <>{item.defaultCommission.value}%</>
                                ) : (
                                  <>Rs. {item.defaultCommission.value}</>
                                )}
                              </span>
                              <span className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-sm inline-block w-fit ${item.hasCustomCommission ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                                {item.hasCustomCommission ? "Custom" : "Global Default"}
                              </span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              disabled={!item.hasCustomCommission}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                !item.hasCustomCommission ? "bg-slate-200 cursor-not-allowed opacity-50" :
                                item.status ? "bg-blue-600" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  !item.hasCustomCommission ? "translate-x-6" :
                                  item.status ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {item.hasCustomCommission ? (
                                <>
                                  <button
                                    onClick={() => handleEdit(item.commissionData)}
                                    className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.commissionData)}
                                    className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    const seller = approvedSellers.find((entry) => entry._id === item._id)
                                    handleSelectSeller(seller)
                                  }}
                                  className="px-3 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                  title="Configure custom commission"
                                >
                                  Configure
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isSellerSelectOpen} onOpenChange={setIsSellerSelectOpen}>
        <DialogContent className="max-w-xl bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-900">Select Seller</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredSellers
                .filter((seller) => !seller.hasCommissionSetup)
                .map((seller) => (
                  <button
                    key={seller._id}
                    onClick={() => handleSelectSeller(seller)}
                    className="w-full p-3 text-left rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-900">{seller.storeName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{seller.sellerId}</p>
                      </div>
                      <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              {filteredSellers.filter((seller) => !seller.hasCommissionSetup).length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">No sellers available</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              {selectedCommission ? "Edit Seller Commission" : "Add Seller Commission"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-4">
            {selectedSeller && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="font-semibold text-sm text-slate-900">{selectedSeller.storeName || selectedSeller.name}</p>
                <p className="text-xs text-slate-600 mt-0.5">{selectedSeller.sellerId || selectedSeller.slug || selectedSeller._id}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default Commission <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <select
                    value={formData.defaultCommission.type}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      defaultCommission: { ...prev.defaultCommission, type: e.target.value },
                    }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (Rs.)</option>
                  </select>
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.defaultCommission.value}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      defaultCommission: { ...prev.defaultCommission, value: e.target.value },
                    }))}
                    className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.defaultCommission ? "border-red-400" : "border-slate-300"
                    }`}
                  />
                  {formErrors.defaultCommission ? (
                    <p className="mt-1 text-xs text-red-500">{formErrors.defaultCommission}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add notes"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-200">
            <button
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
            <DialogTitle>Delete Seller Commission</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 text-sm text-slate-600">
            Are you sure you want to delete this seller commission?
          </div>
          <DialogFooter className="px-6 py-4 border-t border-slate-200">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
