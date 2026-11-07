/**
 * Motor de análise atmosférica comparativa A.D.A.M.
 * Avalia dados coletados de um planeta/setor em relação ao padrão da Terra (1 atm, 21% O2, 0.04% CO2, 78% N2, 15-25°C, <0.05 mSv/h)
 */

export function generateAtmosphereReport(atmosphereData, locationName = 'Setor Desconhecido') {
  const o2 = Number(atmosphereData?.o2 ?? 21.01)
  const co2 = Number(atmosphereData?.co2 ?? 0.05)
  const n2 = Number(atmosphereData?.n2 ?? 78.90)
  const temp = Number(atmosphereData?.temp ?? 22.2)
  const press = Number(atmosphereData?.press ?? 1.034)
  const rad = Number(atmosphereData?.rad ?? 0.20)
  const humid = Number(atmosphereData?.humid ?? 45.0)
  const stability = Number(atmosphereData?.stability ?? 72)

  const risks = []
  const precautions = []
  const comparisons = []

  let dangerPoints = 0

  // 1. Oxigênio (O2) - Base Terra: ~20.95%
  if (o2 < 12) {
    dangerPoints += 4
    risks.push('Asfixia anóxica aguda: perda de consciência em menos de 60 segundos sem suprimento de O₂ pressurizado.')
    precautions.push('Uso mandatório e contínuo de cilindro autônomo com máscara facial de vedação hermética.')
    comparisons.push({ param: 'Oxigênio (O₂)', value: `${o2.toFixed(2)}%`, earth: '20.95%', status: 'Letal (Crítico Baixo)' })
  } else if (o2 < 19.5) {
    dangerPoints += 2
    risks.push('Hipóxia moderada: perda de coordenação motora fina, fadiga acelerada e confusão mental.')
    precautions.push('Recomendado regulador de fluxo e cânula de oxigênio suplementar em atividades físicas intensas.')
    comparisons.push({ param: 'Oxigênio (O₂)', value: `${o2.toFixed(2)}%`, earth: '20.95%', status: 'Rarefeito' })
  } else if (o2 > 24) {
    dangerPoints += 2
    risks.push('Hiperóxia e alta inflamabilidade atmosférica: faíscas mínimas podem causar combustão espontânea.')
    precautions.push('Proibido uso de armas balísticas com pólvora aberta ou ferramentas com emissão de centelhas.')
    comparisons.push({ param: 'Oxigênio (O₂)', value: `${o2.toFixed(2)}%`, earth: '20.95%', status: 'Hiperoxigenado' })
  } else {
    comparisons.push({ param: 'Oxigênio (O₂)', value: `${o2.toFixed(2)}%`, earth: '20.95%', status: 'Ideal' })
  }

  // 2. Dióxido de Carbono (CO2) - Base Terra: ~0.04%
  if (co2 > 3.0) {
    dangerPoints += 4
    risks.push('Hipercapnia letal: intoxicação grave por ácido carbônico no sangue, colapso respiratório e óbito.')
    precautions.push('Filtro catalisador de dióxido de carbono de circuito fechado (Rebreather militar).')
    comparisons.push({ param: 'Dióxido de Carbono (CO₂)', value: `${co2.toFixed(2)}%`, earth: '0.04%', status: 'Tóxico Grave' })
  } else if (co2 > 0.5) {
    dangerPoints += 2
    risks.push('Hipercapnia leve a moderada: cefaleia intensa, tontura, sonolência e falta de ar progressiva.')
    precautions.push('Uso de máscara com cartuchos absorvedores de CO₂ (hidróxido de lítio).')
    comparisons.push({ param: 'Dióxido de Carbono (CO₂)', value: `${co2.toFixed(2)}%`, earth: '0.04%', status: 'Elevado' })
  } else {
    comparisons.push({ param: 'Dióxido de Carbono (CO₂)', value: `${co2.toFixed(2)}%`, earth: '0.04%', status: 'Seguro' })
  }

  // 3. Temperatura (TEMP) - Base Terra: 15°C a 25°C
  if (temp < -20) {
    dangerPoints += 3
    risks.push('Criopatia e hipotermia fulminante: congelamento de extremidades em poucos minutos sem isolamento térmico.')
    precautions.push('Exoesqueleto ou traje blindado com aquecedores elétricos integrados e camada de vácuo térmico.')
    comparisons.push({ param: 'Temperatura', value: `${temp.toFixed(1)}°C`, earth: '21.0°C', status: 'Congelamento Extremo' })
  } else if (temp < 5) {
    dangerPoints += 1
    risks.push('Estresse térmico por frio: tremores musculares incontroláveis e queda nos reflexos táteis.')
    precautions.push('Casacos térmicos reforçados e luvas isolantes anti-radiação fria.')
    comparisons.push({ param: 'Temperatura', value: `${temp.toFixed(1)}°C`, earth: '21.0°C', status: 'Frio Rigoroso' })
  } else if (temp > 45) {
    dangerPoints += 3
    risks.push('Hipertermia severa e queimaduras respiratórias por inalação de ar superaquecido.')
    precautions.push('Armadura com sistema de resfriamento líquido circulante e radiadores dorsais.')
    comparisons.push({ param: 'Temperatura', value: `${temp.toFixed(1)}°C`, earth: '21.0°C', status: 'Calor Escaldante' })
  } else if (temp > 32) {
    dangerPoints += 1
    risks.push('Desidratação rápida e exaustão por calor.')
    precautions.push('Hidratação eletrolítica contínua e ventilação biomecânica.')
    comparisons.push({ param: 'Temperatura', value: `${temp.toFixed(1)}°C`, earth: '21.0°C', status: 'Elevada' })
  } else {
    comparisons.push({ param: 'Temperatura', value: `${temp.toFixed(1)}°C`, earth: '21.0°C', status: 'Confortável' })
  }

  // 4. Pressão Atmosférica (PRESS) - Base Terra: 1.000 atm
  if (press < 0.5) {
    dangerPoints += 3
    risks.push('Barotrauma descompressivo: vaporização e ebulismo de fluidos corporais expostos à baixa pressão.')
    precautions.push('Traje hermético de pressurização mecânica com controle barométrico pneumático.')
    comparisons.push({ param: 'Pressão', value: `${press.toFixed(3)} atm`, earth: '1.000 atm', status: 'Hipobárica Crítica' })
  } else if (press > 1.8) {
    dangerPoints += 2
    risks.push('Narcose gasosa por nitrogênio sob alta pressão e compressão pulmonar mecânica.')
    precautions.push('Câmara de descompressão antes do retorno a áreas padrão e misturas respiratórias com Hélio (Heliox).')
    comparisons.push({ param: 'Pressão', value: `${press.toFixed(3)} atm`, earth: '1.000 atm', status: 'Hiperbárica' })
  } else {
    comparisons.push({ param: 'Pressão', value: `${press.toFixed(3)} atm`, earth: '1.000 atm', status: 'Equilibrada' })
  }

  // 5. Radiação (RAD) - Base Terra: ~0.0002 mSv/h (<0.05 mSv/h)
  if (rad > 2.0) {
    dangerPoints += 4
    risks.push('Síndrome Aguda de Radiação (ARS): destruição celular de medula e epitélio gástrico em curto prazo.')
    precautions.push('Traje de chumbo blindado de alta densidade e administração imediata de agentes radioprotetores (Rad-Away).')
    comparisons.push({ param: 'Radiação', value: `${rad.toFixed(2)} mSv/h`, earth: '<0.05 mSv/h', status: 'Ionizante Letal' })
  } else if (rad > 0.4) {
    dangerPoints += 2
    risks.push('Exposição cumulativa perigosa a partículas gama/cósmicas: limite máximo de 2 horas de operação contínua.')
    precautions.push('Dosímetro ativo no pulso com alarme de dose acumulada e mantas de boro nos veículos.')
    comparisons.push({ param: 'Radiação', value: `${rad.toFixed(2)} mSv/h`, earth: '<0.05 mSv/h', status: 'Alerta Amarelo' })
  } else {
    comparisons.push({ param: 'Radiação', value: `${rad.toFixed(2)} mSv/h`, earth: '<0.05 mSv/h', status: 'Baixa / Normal' })
  }

  // 6. Humidade (HUMID) - Base Terra: 40% a 60%
  comparisons.push({
    param: 'Humidade',
    value: `${humid.toFixed(1)}%`,
    earth: '45.0%',
    status: humid < 20 ? 'Muito Seco' : humid > 80 ? 'Saturado de Vapor' : 'Estável'
  })

  // 7. Nitrogênio (N2)
  comparisons.push({
    param: 'Nitrogênio (N₂)',
    value: `${n2.toFixed(2)}%`,
    earth: '78.08%',
    status: n2 > 85 ? 'Excesso de Diluente' : n2 < 65 ? 'Deficiência de Gás Inerte' : 'Balanceado'
  })

  // Determinação de Classe e Veredito Geral
  let classification = ''
  let badgeColor = ''
  let generalVerdict = ''

  if (dangerPoints >= 5) {
    classification = 'INÓSPITA / LETAL IMEDIATO (CLASSE D)'
    badgeColor = '#ef4444' // Vermelho
    generalVerdict = 'A atmosfera deste setor é categoricamente letal para a fisiologia humana sem suporte de vida avançado. A exposição direta aos elementos causará colapso orgânico fulminante.'
  } else if (dangerPoints >= 3) {
    classification = 'ATMOSFERA TÓXICA / HOSTIL (CLASSE C)'
    badgeColor = '#f97316' // Laranja
    generalVerdict = 'Ambiente hostil. A permanência sem equipamento de proteção individual e respirador hermético provocará danos biológicos severos e intoxicação.'
  } else if (dangerPoints >= 1) {
    classification = 'RESPIRABILIDADE CONDICIONAL (CLASSE B)'
    badgeColor = '#eab308' // Amarelo
    generalVerdict = 'Atmosfera respirável de forma restrita ou com desconforto físico. Recomenda-se cautela, monitoramento de parâmetros e filtros nasais básicos.'
  } else {
    classification = 'RESPIRÁVEL / PADRÃO TERRA (CLASSE A)'
    badgeColor = '#10b981' // Verde
    generalVerdict = 'Composição atmosférica perfeitamente equilibrada e compatível com os padrões de suporte biológico da Terra. Respirável ao ar livre sem necessidade de máscaras.'
    if (precautions.length === 0) {
      precautions.push('Nenhum equipamento de suporte respiratório especial requerido para exploração padrão.')
    }
    if (risks.length === 0) {
      risks.push('Sem riscos biológicos imediatos detectados pelos sensores.')
    }
  }

  return {
    id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    locationName,
    timestamp: Date.now(),
    raw: { o2, co2, n2, temp, press, rad, humid, stability },
    classification,
    badgeColor,
    generalVerdict,
    comparisons,
    risks,
    precautions,
    stability
  }
}

