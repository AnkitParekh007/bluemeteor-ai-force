/**
 * Agent card portrait assets: `src/assets/images/{slug}.png`.
 * Dimensions and size are read from each PNG (IHDR + file length).
 *
 * Regenerate: `node scripts/generate-agent-card-images.mjs`
 */

export interface AgentCardImageMeta {
	readonly src: string;
	readonly width: number;
	readonly height: number;
	readonly byteLength: number;
	readonly fileName: string;
}

export const AGENT_CARD_IMAGE_MAP: Readonly<Partial<Record<string, AgentCardImageMeta>>> = {
	'fronto': { src: '/assets/images/fronto.png', width: 1254, height: 1254, byteLength: 1464403, fileName: "fronto.png" },
	'backo': { src: '/assets/images/backo.png', width: 1254, height: 1254, byteLength: 1217069, fileName: "backo.png" },
	'stacko': { src: '/assets/images/stacko.png', width: 1254, height: 1254, byteLength: 1229043, fileName: "stacko.png" },
	'devopsy': { src: '/assets/images/devopsy.png', width: 1254, height: 1254, byteLength: 1539924, fileName: "devopsy.png" },
	'testo': { src: '/assets/images/testo.png', width: 1254, height: 1254, byteLength: 1612917, fileName: "testo.png" },
	'automo': { src: '/assets/images/automo.png', width: 1254, height: 1254, byteLength: 1552246, fileName: "automo.png" },
	'designo': { src: '/assets/images/designo.png', width: 1254, height: 1254, byteLength: 1569403, fileName: "designo.png" },
	'writeo': { src: '/assets/images/writeo.png', width: 1254, height: 1254, byteLength: 1333201, fileName: "writeo.png" },
	'doco': { src: '/assets/images/doco.png', width: 1254, height: 1254, byteLength: 1632414, fileName: "doco.png" },
	'dato': { src: '/assets/images/dato.png', width: 1254, height: 1254, byteLength: 1555534, fileName: "dato.png" },
	'sciento': { src: '/assets/images/sciento.png', width: 1254, height: 1254, byteLength: 1750771, fileName: "sciento.png" },
	'intelli': { src: '/assets/images/intelli.png', width: 1254, height: 1254, byteLength: 1350334, fileName: "intelli.png" },
	'dbo': { src: '/assets/images/dbo.png', width: 1254, height: 1254, byteLength: 1689845, fileName: "dbo.png" },
	'cloudo': { src: '/assets/images/cloudo.png', width: 1254, height: 1254, byteLength: 1609352, fileName: "cloudo.png" },
	'securo': { src: '/assets/images/securo.png', width: 1254, height: 1254, byteLength: 1692164, fileName: "securo.png" },
	'cybero': { src: '/assets/images/cybero.png', width: 1254, height: 1254, byteLength: 1761344, fileName: "cybero.png" },
	'producto': { src: '/assets/images/producto.png', width: 1254, height: 1254, byteLength: 1632645, fileName: "producto.png" },
	'techproducto': { src: '/assets/images/techproducto.png', width: 1254, height: 1254, byteLength: 1811425, fileName: "techproducto.png" },
	'planno': { src: '/assets/images/planno.png', width: 1254, height: 1254, byteLength: 1673343, fileName: "planno.png" },
	'programo': { src: '/assets/images/programo.png', width: 1254, height: 1254, byteLength: 1705491, fileName: "programo.png" },
	'analytico': { src: '/assets/images/analytico.png', width: 1254, height: 1254, byteLength: 1661529, fileName: "analytico.png" },
	'solvo': { src: '/assets/images/solvo.png', width: 1254, height: 1254, byteLength: 1696444, fileName: "solvo.png" },
	'cto-x': { src: '/assets/images/cto-x.png', width: 1254, height: 1254, byteLength: 1722739, fileName: "cto-x.png" },
	'engino': { src: '/assets/images/engino.png', width: 1254, height: 1254, byteLength: 1875720, fileName: "engino.png" },
	'marketo': { src: '/assets/images/marketo.png', width: 1254, height: 1254, byteLength: 1749410, fileName: "marketo.png" },
	'growo': { src: '/assets/images/growo.png', width: 1254, height: 1254, byteLength: 1725626, fileName: "growo.png" },
	'seono': { src: '/assets/images/seono.png', width: 1254, height: 1254, byteLength: 1798462, fileName: "seono.png" },
	'contento': { src: '/assets/images/contento.png', width: 1254, height: 1254, byteLength: 1752098, fileName: "contento.png" },
	'sello': { src: '/assets/images/sello.png', width: 1254, height: 1254, byteLength: 1841526, fileName: "sello.png" },
	'supporto': { src: '/assets/images/supporto.png', width: 1254, height: 1254, byteLength: 1645813, fileName: "supporto.png" },
	'successo': { src: '/assets/images/successo.png', width: 1254, height: 1254, byteLength: 1741364, fileName: "successo.png" },
	'finanzo': { src: '/assets/images/finanzo.png', width: 1254, height: 1254, byteLength: 1719930, fileName: "finanzo.png" },
	'accounto': { src: '/assets/images/accounto.png', width: 1254, height: 1254, byteLength: 1749727, fileName: "accounto.png" },
	'huro': { src: '/assets/images/huro.png', width: 1254, height: 1254, byteLength: 1729456, fileName: "huro.png" },
	'hireo': { src: '/assets/images/hireo.png', width: 1254, height: 1254, byteLength: 1710032, fileName: "hireo.png" },
	'legalo': { src: '/assets/images/legalo.png', width: 1254, height: 1254, byteLength: 1381095, fileName: "legalo.png" },
	'opero': { src: '/assets/images/opero.png', width: 1254, height: 1254, byteLength: 1753289, fileName: "opero.png" },
	'supplyo': { src: '/assets/images/supplyo.png', width: 1254, height: 1254, byteLength: 1894047, fileName: "supplyo.png" },
	'flowo': { src: '/assets/images/flowo.png', width: 1254, height: 1254, byteLength: 1725467, fileName: "flowo.png" },
	'mlo': { src: '/assets/images/mlo.png', width: 1254, height: 1254, byteLength: 1453693, fileName: "mlo.png" },
	'aiops': { src: '/assets/images/aiops.png', width: 1254, height: 1254, byteLength: 1789078, fileName: "aiops.png" },
	'researcho': { src: '/assets/images/researcho.png', width: 1254, height: 1254, byteLength: 1349667, fileName: "researcho.png" },
	'scrumo': { src: '/assets/images/scrumo.png', width: 1254, height: 1254, byteLength: 1517749, fileName: "scrumo.png" },
	'integrato': { src: '/assets/images/integrato.png', width: 1254, height: 1254, byteLength: 1350765, fileName: "integrato.png" },
	'apigen': { src: '/assets/images/apigen.png', width: 1254, height: 1254, byteLength: 1459865, fileName: "apigen.png" },
	'monitoro': { src: '/assets/images/monitoro.png', width: 1254, height: 1254, byteLength: 1771748, fileName: "monitoro.png" },
	'perfx': { src: '/assets/images/perfx.png', width: 1254, height: 1254, byteLength: 1722525, fileName: "perfx.png" },
	'uxres': { src: '/assets/images/uxres.png', width: 1254, height: 1254, byteLength: 1736023, fileName: "uxres.png" },
	'socialo': { src: '/assets/images/socialo.png', width: 1254, height: 1254, byteLength: 1842179, fileName: "socialo.png" },
	'emailo': { src: '/assets/images/emailo.png', width: 1254, height: 1254, byteLength: 1775475, fileName: "emailo.png" },
	'growtho': { src: '/assets/images/growtho.png', width: 1254, height: 1254, byteLength: 1821002, fileName: "growtho.png" },
	'traino': { src: '/assets/images/traino.png', width: 1254, height: 1254, byteLength: 1821550, fileName: "traino.png" },
	'feedbacko': { src: '/assets/images/feedbacko.png', width: 1254, height: 1254, byteLength: 1729922, fileName: "feedbacko.png" },
	'auditai': { src: '/assets/images/auditai.png', width: 1254, height: 1254, byteLength: 1772601, fileName: "auditai.png" },
	'complianceo': { src: '/assets/images/complianceo.png', width: 1254, height: 1254, byteLength: 1610971, fileName: "complianceo.png" },
};

export function getAgentCardImage(slug: string): AgentCardImageMeta | undefined {
	return AGENT_CARD_IMAGE_MAP[slug];
}
