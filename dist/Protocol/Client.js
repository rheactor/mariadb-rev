import{CapabilitiesBase as T,CapabilitiesExtended as E,CapabilitiesMariaDB as t,Collations as _}from"./Enumerations.js";export const capabilitiesBase=T.CONNECT_WITH_DB|T.CLIENT_PROTOCOL_41|T.SECURE_CONNECTION;export const capabilitiesExtended=E.MULTI_STATEMENTS|E.MULTI_RESULTS|E.PLUGIN_AUTH|E.PLUGIN_AUTH_LENENC_CLIENT_DATA;export const capabilitiesMariaDB=t.MARIADB_CLIENT_EXTENDED_METADATA;export const defaultCollation=_.utf8mb4_general_ci;