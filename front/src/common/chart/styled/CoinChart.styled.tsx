import { Shadow } from "@styled/index"
import { ISizeProps } from "@utils/interFace/styled.interface"
import { styled } from "styled-components"

export const CoinChartWrap = styled.div<ISizeProps>`
    padding: 0.25rem 0;
    width: 100%;
    border-radius: 1rem;
`

export const CoinChartHeaderWrap = styled.header<ISizeProps>`
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 4.8rem;
    border-top: 1px solid #787878;
    border-bottom: 1px solid #686868;
    color: ${({ theme, mode }) => mode && theme[mode].text};
`

export const CoinChartHedaerContent = styled.div<ISizeProps>`
    width: ${({ width }) => width || "100%"};
    min-height: ${({ height }) => height || "4.8rem"};
    font-weight: 600;
    font-size: 1.2rem;
    text-align: center;
    line-height: ${({ height }) => height || "4.8rem"};
    &:nth-child(3) {
        text-align: end;
        padding: 0 3rem 0 0;
    }
`
