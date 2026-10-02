import { VERDENA_CNPJ } from "../lib/nfeXml";

const item = (cfop = "5102", discount = "1.00") => `<det nItem="1"><prod><xProd>Soja sintética</xProd><NCM>12019000</NCM><CFOP>${cfop}</CFOP><uCom>KG</uCom><qCom>10.0000</qCom><vUnCom>5.0000</vUnCom><vProd>50.00</vProd>${discount ? `<vDesc>${discount}</vDesc>` : ""}</prod></det>`;

// Fixture integralmente sintética: não contém qualquer dado do XML real da operação.
export const nfeXmlFixture = (options: { issuer?: string; status?: string; cfop?: string; total?: string; recipientTag?: "CPF" | "CNPJ"; ie?: boolean; second?: boolean; key?: string } = {}) => {
  // O total deve refletir os descontos dos dois itens (1,00 + 2,00).
  const discount = options.second ? "3.00" : "1.00";
  const gross = options.second ? "100.00" : "50.00";
  const total = options.total ?? (options.second ? "97.00" : "49.00");
  const recipientTag = options.recipientTag ?? "CPF";
  const recipient = recipientTag === "CPF" ? "12345678901" : "12345678000199";
  const key = options.key ?? "51261057260906000162550010000004171000000010";
  return `<?xml version="1.0"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${key}"><ide><mod>55</mod><serie>1</serie><nNF>417</nNF><tpNF>1</tpNF></ide><emit><CNPJ>${options.issuer ?? VERDENA_CNPJ}</CNPJ></emit><dest><xNome>Produtor Sintético</xNome><${recipientTag}>${recipient}</${recipientTag}>${options.ie === false ? "" : "<IE>12345</IE>"}<enderDest><xLgr>Estrada Rural</xLgr><nro>10</nro><xCpl>Lote 2</xCpl><xBairro>Zona Rural</xBairro><xMun>Sorriso</xMun><UF>MT</UF><CEP>78890000</CEP></enderDest></dest>${item(options.cfop)}${options.second ? item("6102", "2.00").replace('nItem="1"', 'nItem="2"') : ""}<total><ICMSTot><vProd>${gross}</vProd><vDesc>${discount}</vDesc><vNF>${total}</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><chNFe>${key}</chNFe><cStat>${options.status ?? "100"}</cStat></infProt></protNFe></nfeProc>`;
};
