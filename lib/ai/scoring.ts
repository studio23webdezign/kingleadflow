import type { ExtractedInquiry } from "./types";

export type ContractorContext = {
  services: string[];
  serviceAreas: string[];
};

export function scoreLead(
  inquiry: ExtractedInquiry,
  context: ContractorContext,
) {
  const requestedService = inquiry.service_requested.trim().toLowerCase();
  const configuredServices = context.services.map((service) => service.trim().toLowerCase()).filter(Boolean);
  const serviceNeed = !requestedService
    ? (inquiry.summary.trim() ? 12 : 0)
    : configuredServices.length === 0
      ? 20
      : configuredServices.some((service) => requestedService.includes(service) || service.includes(requestedService))
        ? 20
        : 8;
  const contactCompleteness =
    (inquiry.contact_name.trim() ? 5 : 0) +
    (inquiry.email.trim() ? 8 : 0) +
    (inquiry.phone.trim() ? 7 : 0);

  const locationText = `${inquiry.postal_code} ${inquiry.summary} ${inquiry.service_requested}`.toLowerCase();
  let serviceAreaMatch = 8;
  if (context.serviceAreas.length > 0) {
    serviceAreaMatch = context.serviceAreas.some((area) => {
      const normalized = area.trim().toLowerCase();
      return normalized.length > 1 && locationText.includes(normalized);
    }) ? 20 : inquiry.postal_code.trim() ? 0 : 8;
  }

  const urgency = ({ high: 20, medium: 12, low: 5, unknown: 8 } as const)[inquiry.urgency];
  const readiness = ({ ready: 20, considering: 12, researching: 5, unknown: 8 } as const)[inquiry.purchase_readiness];
  const score = Math.max(0, Math.min(100, serviceNeed + contactCompleteness + serviceAreaMatch + urgency + readiness));
  const priority = score >= 80 ? "high" : score >= 50 ? "medium" : "low";

  return {
    score,
    priority,
    reasons: [
      `Service need: ${serviceNeed}/20 — ${requestedService ? (configuredServices.length === 0 ? "a service was identified; no service catalogue is configured" : serviceNeed === 20 ? "the requested service matches the configured catalogue" : "the requested service does not match the configured catalogue") : inquiry.summary.trim() ? "a project need was described, but the service is unclear" : "no clear project need was identified"}.`,
      `Contact completeness: ${contactCompleteness}/20 — name, email and phone details were checked.`,
      `Service-area fit: ${serviceAreaMatch}/20 — ${context.serviceAreas.length ? (serviceAreaMatch === 20 ? "the inquiry mentions a configured service area" : serviceAreaMatch === 0 ? "the location could not be matched to configured service areas" : "location fit is not yet clear") : "no service areas are configured, so a neutral score was used"}.`,
      `Urgency: ${urgency}/20 — classified as ${inquiry.urgency}.`,
      `Purchase readiness: ${readiness}/20 — classified as ${inquiry.purchase_readiness}.`,
    ],
  };
}
