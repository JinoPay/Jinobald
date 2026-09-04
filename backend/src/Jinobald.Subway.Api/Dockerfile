# 저장소 루트를 컨텍스트로 빌드합니다:  docker build -f backend/src/Jinobald.Subway.Api/Dockerfile -t jinobald-subway .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/ backend/
RUN dotnet publish backend/src/Jinobald.Subway.Api/Jinobald.Subway.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# 데이터셋은 컨테이너에 함께 넣습니다. 볼륨으로 덮어써도 됩니다.
COPY scripts/data/raw /data/raw
COPY scripts/data/station_code.raw.csv /data/station_code.raw.csv
ENV Datasets__RawDir=/data/raw \
    Database__Path=/app/data/subway.db \
    ASPNETCORE_ENVIRONMENT=Production
# 루트로 돌리지 않습니다. aspnet 이미지의 비루트 사용자 `app` 이 DB 디렉터리를 쓸 수 있어야 합니다.
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app
EXPOSE 5080
VOLUME ["/app/data"]
ENTRYPOINT ["dotnet", "Jinobald.Subway.Api.dll"]
