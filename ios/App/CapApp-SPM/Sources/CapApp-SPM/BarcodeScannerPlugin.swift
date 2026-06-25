import AVFoundation
import Capacitor
import UIKit

@objc(BarcodeScannerPlugin)
public class BarcodeScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarcodeScannerPlugin"
    public let jsName = "BarcodeScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    private var scannerViewController: QRScannerViewController?
    private var scanCall: CAPPluginCall?

    @objc func isSupported(_ call: CAPPluginCall) {
        let supported = UIImagePickerController.isSourceTypeAvailable(.camera)
        call.resolve(["supported": supported])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["camera": permissionState()])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            call.resolve(["camera": "granted"])
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    call.resolve(["camera": granted ? "granted" : "denied"])
                }
            }
        case .denied, .restricted:
            call.resolve(["camera": "denied"])
        @unknown default:
            call.resolve(["camera": "prompt"])
        }
    }

    @objc func scan(_ call: CAPPluginCall) {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            call.reject("Camera is not available.")
            return
        }

        guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else {
            call.reject("Camera permission has not been granted.")
            return
        }

        DispatchQueue.main.async {
            guard self.scannerViewController == nil else {
                call.reject("A scan is already in progress.")
                return
            }

            let scanner = QRScannerViewController()
            scanner.onCodeScanned = { [weak self] rawValue in
                self?.finishScan(rawValue: rawValue)
            }
            scanner.onCancel = { [weak self] in
                self?.cancelScan()
            }

            self.scanCall = call
            self.scannerViewController = scanner
            self.bridge?.viewController?.present(scanner, animated: true)
        }
    }

    private func permissionState() -> String {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            return "granted"
        case .notDetermined:
            return "prompt"
        case .denied, .restricted:
            return "denied"
        @unknown default:
            return "prompt"
        }
    }

    private func finishScan(rawValue: String) {
        scannerViewController?.dismiss(animated: true)
        scannerViewController = nil
        scanCall?.resolve([
            "barcodes": [
                [
                    "rawValue": rawValue,
                    "displayValue": rawValue,
                    "format": "QR_CODE"
                ]
            ]
        ])
        scanCall = nil
    }

    private func cancelScan() {
        scannerViewController?.dismiss(animated: true)
        scannerViewController = nil
        scanCall?.resolve(["barcodes": []])
        scanCall = nil
    }
}

private final class QRScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCodeScanned: ((String) -> Void)?
    var onCancel: (() -> Void)?

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var hasResolvedScan = false

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .black
        configureScanner()
        configureCancelButton()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if !session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async {
                self.session.startRunning()
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning {
            session.stopRunning()
        }
    }

    private func configureScanner() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input)
        else {
            onCancel?()
            return
        }

        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            onCancel?()
            return
        }

        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
        output.metadataObjectTypes = [.qr]

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.insertSublayer(layer, at: 0)
        previewLayer = layer
    }

    private func configureCancelButton() {
        let button = UIButton(type: .system)
        button.setTitle("Cancel", for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        button.layer.cornerRadius = 8
        button.contentEdgeInsets = UIEdgeInsets(top: 10, left: 16, bottom: 10, right: 16)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        view.addSubview(button)
        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            button.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16)
        ])
    }

    @objc private func cancelTapped() {
        onCancel?()
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !hasResolvedScan,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              object.type == .qr,
              let rawValue = object.stringValue
        else { return }

        hasResolvedScan = true
        session.stopRunning()
        onCodeScanned?(rawValue)
    }
}
