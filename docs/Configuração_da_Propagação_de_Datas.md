# Configuração da Propagação de Datas

## Quando estiver a propagação ativa, quem determinará as datas das entidades superiores serão as entidades inferiores (Entidades filhas)

_Propriedade utilizada:_ planooperativo.propagar-datas-previstas = true

Bloqueio de datas pelas entidades superiores por nível de informação:

É possível bloquear o as datas das entidades filhas a partir da entidade superior (Entidade pai), com isso só poderão ser criadas entidades filhas dentro dos limites de datas definidos pela entidade superior.  
<br/>Datas de Início Previsto

planooperativo.nivel-pai-restringe-data-inicio-previsto-nivel-1

planooperativo.nivel-pai-restringe-data-inicio-previsto-nivel-2

planooperativo.nivel-pai-restringe-data-inicio-previsto-nivel-3

planooperativo.nivel-pai-restringe-data-inicio-previsto-nivel-4

planooperativo.nivel-pai-restringe-data-inicio-previsto-nivel-5

Datas de Término Previsto

planooperativo.nivel-pai-restringe-data-termino-previsto-fim-nivel-1

planooperativo.nivel-pai-restringe-data-termino-previsto-fim-nivel-2

planooperativo.nivel-pai-restringe-data-termino-previsto-fim-nivel-3

planooperativo.nivel-pai-restringe-data-termino-previsto-fim-nivel-4

planooperativo.nivel-pai-restringe-data-termino-previsto-fim-nivel-5

## Configuração de Restrição de Datas

## Quando estiver a propagação ativa, quem determinará as datas das entidades inferiores serão as entidades superiores (Entidades Pai)

_Propriedade utilizada:_ planooperativo.propagar-datas-previstas = false

Bloqueio de datas pelas entidades superiores por nível de informação:

É possível bloquear o as datas das entidades filhas a partir da entidade superior (Entidade pai), com isso só poderão ser criadas entidades filhas dentro dos limites de datas definidos pela entidade superior.

